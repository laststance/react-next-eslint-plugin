import { existsSync, readFileSync, realpathSync } from 'node:fs'
import { dirname, isAbsolute, relative, resolve } from 'node:path'
import { isCustomHookName } from './hooks.js'
import { isPascalCase } from './naming.js'

const snapshots = new WeakMap()
const verificationFile =
  /(?:^|\/)(?:__tests__|__mocks__|\.storybook)(?:\/|$)|\.(?:test|spec|stories|story)\.[cm]?[jt]sx?$/
const generatedFile =
  /(?:^|\/)(?:__generated__|generated|\.next)(?:\/|$)|\.(?:generated|gen)\.[cm]?[jt]sx?$/
const assetImport =
  /\.(?:css|s[ac]ss|less|styl|svg|png|jpe?g|gif|webp|avif|ico|json|woff2?|ttf|otf|eot)(?:[?#].*)?$/

/** Canonicalizes compiler paths for {@link getHookOwnership} without conflating case-sensitive files. @example canonicalPath('./src/useCart.ts') */
function canonicalPath(filename) {
  try {
    return realpathSync.native(filename).replaceAll('\\', '/')
  } catch {
    return resolve(filename).replaceAll('\\', '/')
  }
}

/** Checks application containment before {@link buildOwnership} treats a file as a placement target. @example isWithin('/app', '/app/src/a.ts') // true */
function isWithin(directory, filename) {
  const path = relative(directory, filename)
  return (
    path !== '..' &&
    !path.startsWith('../') &&
    !path.startsWith('..\\') &&
    !isAbsolute(path)
  )
}

/** Reuses an unchanged compiler snapshot for the rule adapter. @param {import('typescript').Program} program Complete application. @param {typeof import('typescript')} typescript Supported compiler API. @returns {ReturnType<typeof buildOwnership>} Ownership graph. @example getHookOwnership(program, typescript).hooks */
export function getHookOwnership(program, typescript) {
  const sources = program.getSourceFiles()
  const checker = program.getTypeChecker()
  const options = program.getCompilerOptions()
  const signature = JSON.stringify([
    options.configFilePath,
    options.paths,
    options.baseUrl,
    options.rootDirs,
    options.moduleResolution,
    options.preserveSymlinks,
    program.getRootFileNames(),
    program.getProjectReferences(),
  ])
  const previous = snapshots.get(program)
  // ponytail: O(files) validation per linted file; optimize only with equivalent host snapshot guarantees.
  if (
    previous?.checker === checker &&
    previous.signature === signature &&
    sources.length === previous.sources.length &&
    sources.every(
      (source, index) =>
        source === previous.sources[index] &&
        source.text === previous.texts[index],
    ) &&
    [...previous.manifests].every(([filename, text]) => {
      try {
        return text === null
          ? !existsSync(filename)
          : readFileSync(filename, 'utf8') === text
      } catch {
        return false
      }
    })
  ) {
    return previous.result
  }
  const manifests = new Map()
  const result = buildOwnership(program, typescript, manifests)
  snapshots.set(program, {
    checker,
    signature,
    sources: [...sources],
    texts: sources.map((source) => source.text),
    manifests,
    result,
  })
  return result
}

/** Builds canonical call edges and propagates owners for {@link getHookOwnership} after a snapshot changes. @example buildOwnership(program, typescript, new Map()) */
function buildOwnership(program, ts, manifests) {
  const options = program.getCompilerOptions()
  if (
    typeof options.configFilePath !== 'string' ||
    program.getProjectReferences()?.length
  ) {
    throw new Error(
      'no-single-use-hook-file requires one complete application Program with a configured tsconfig.json and no project references; include every production consumer in that project.',
    )
  }
  const root = canonicalPath(dirname(options.configFilePath))
  // A fallback '*' mapping does not make every untyped external import local.
  const localPrefixes = Object.keys(options.paths || {})
    .map((pattern) => pattern.split('*')[0])
    .filter(Boolean)
  const checker = program.getTypeChecker()
  const sources = program
    .getSourceFiles()
    .filter((source) => !source.isDeclarationFile)
  const records = new Map()
  const implementations = new Map()
  const assignedSymbols = new Set()
  const metadata = new Map()
  const packages = new Map()
  const importedVerification = new Set()
  const dependencies = new Map()

  /** Finds package boundaries for {@link fileInfo}; cached directory lookups avoid repeated ancestor scans. @example packageAt('/app/src') */
  function packageAt(directory) {
    if (packages.has(directory)) return packages.get(directory)
    const filename = resolve(directory, 'package.json')
    let result
    if (existsSync(filename)) {
      try {
        const text = readFileSync(filename, 'utf8')
        manifests.set(filename, text)
        result = { directory, data: JSON.parse(text) }
      } catch {
        throw new Error(
          `no-single-use-hook-file cannot read package boundary ${filename}.`,
        )
      }
    } else {
      // New nested manifests also change ownership, so remember absent boundaries.
      manifests.set(filename, null)
      const parent = dirname(directory)
      result = parent === directory ? null : packageAt(parent)
    }
    packages.set(directory, result)
    return result
  }
  const applicationPackage = packageAt(root)

  /** Separates diagnostic targets from runtime evidence for {@link buildOwnership}. @example fileInfo(source).external */
  function fileInfo(source) {
    if (metadata.has(source)) return metadata.get(source)
    const file = canonicalPath(source.fileName)
    const ownPackage = packageAt(dirname(file))
    const external =
      !isWithin(root, file) ||
      file.includes('/node_modules/') ||
      ownPackage?.directory !== applicationPackage?.directory
    const result = {
      file,
      external,
      verification: verificationFile.test(file),
      generated:
        generatedFile.test(file) ||
        /@generated|auto-generated/i.test(source.text.slice(0, 300)),
      public:
        ownPackage?.data.private !== true &&
        Boolean(
          ownPackage?.data.exports ||
          ownPackage?.data.main ||
          ownPackage?.data.module,
        ),
    }
    metadata.set(source, result)
    return result
  }

  /** Removes syntax-only wrappers before {@link resolveFunction} follows values. @example unwrap(parenthesizedExpression) */
  function unwrap(node) {
    while (
      node &&
      (ts.isParenthesizedExpression(node) ||
        ts.isAsExpression(node) ||
        ts.isTypeAssertionExpression(node) ||
        ts.isNonNullExpression(node) ||
        ts.isSatisfiesExpression(node) ||
        ts.isExpressionWithTypeArguments(node))
    )
      node = node.expression
    return node
  }

  /** Resolves ESM aliases for {@link resolveFunction} without confusing same-named declarations. @example symbolAt(importedIdentifier) */
  function symbolAt(node) {
    let symbol =
      ts.isIdentifier(node) && ts.isShorthandPropertyAssignment(node.parent)
        ? checker.getShorthandAssignmentValueSymbol(node.parent)
        : checker.getSymbolAtLocation(node)
    const seen = new Set()
    // Alias cycles are incomplete references, never additional implementations.
    while (symbol?.flags & ts.SymbolFlags.Alias) {
      if (seen.has(symbol)) return undefined
      seen.add(symbol)
      symbol = checker.getAliasedSymbol(symbol)
    }
    return symbol
  }

  /** Recognizes React's real wrapper bindings for {@link resolveFunction}, including aliases. @example reactWrapper(memoCallee) // true */
  function reactWrapper(expression, seen = new Set()) {
    const node = unwrap(expression)
    if (!node || seen.has(node)) return false
    seen.add(node)
    const symbol = symbolAt(
      ts.isPropertyAccessExpression(node) ? node.name : node,
    )
    if (!symbol || assignedSymbols.has(symbol)) return false
    // Resolve local wrapper aliases without trusting a shadowed function named memo.
    for (const declaration of symbol.declarations || []) {
      if (
        ts.isVariableDeclaration(declaration) &&
        declaration.parent.flags & ts.NodeFlags.Const &&
        declaration.initializer &&
        reactWrapper(declaration.initializer, seen)
      )
        return true
      if (!['memo', 'forwardRef'].includes(symbol.name)) continue
      if (
        /\/node_modules\/(?:@types\/)?react\//.test(
          canonicalPath(declaration.getSourceFile().fileName),
        )
      )
        return true
      for (let parent = declaration.parent; parent; parent = parent.parent) {
        if (
          ts.isModuleDeclaration(parent) &&
          ts.isStringLiteral(parent.name) &&
          parent.name.text === 'react'
        )
          return true
      }
    }
    return false
  }

  /** Follows static callable aliases for graph construction; unknown wrappers deliberately remain unresolved. @example resolveFunction(call.expression) */
  function resolveFunction(expression, seen = new Set(), staticOnly = false) {
    const node = unwrap(expression)
    if (!node || seen.has(node)) return undefined
    seen.add(node)
    if (records.has(node)) return records.get(node)
    if (ts.isCallExpression(node))
      return reactWrapper(node.expression)
        ? resolveFunction(node.arguments[0], seen, staticOnly)
        : undefined
    if (
      ts.isElementAccessExpression(node) &&
      !ts.isStringLiteralLike(node.argumentExpression)
    )
      return undefined
    if (
      staticOnly &&
      (ts.isPropertyAccessExpression(node) ||
        ts.isElementAccessExpression(node)) &&
      !namespaceSymbol(node.expression, new Set(), true)
    )
      return undefined
    const symbol = symbolAt(
      ts.isPropertyAccessExpression(node) ? node.name : node,
    )
    if (staticOnly && assignedSymbols.has(symbol)) return undefined
    // A symbol can own export declarations, aliases, or the implementation itself.
    for (const declaration of symbol?.declarations || []) {
      if (
        staticOnly &&
        ts.isVariableDeclaration(declaration) &&
        !(declaration.parent.flags & ts.NodeFlags.Const)
      )
        return undefined
      if (records.has(declaration)) return records.get(declaration)
      const value = ts.isExportAssignment(declaration)
        ? declaration.expression
        : declaration.initializer
      const record = value && resolveFunction(value, seen, staticOnly)
      if (record) return record
    }
    return undefined
  }

  /** Names unnamed wrapper implementations during {@link indexFunctions}; opaque wrappers retain uncertainty. @example bindingFor(arrowFunction) */
  function bindingFor(node) {
    let name = node.name && ts.isIdentifier(node.name) ? node.name.text : ''
    let opaque = false
    let wrapped = false
    let ancestor = node.parent
    while (
      ancestor &&
      !ts.isFunctionLike(ancestor) &&
      !ts.isSourceFile(ancestor)
    ) {
      if (ts.isCallExpression(ancestor)) {
        const knownWrapper = reactWrapper(ancestor.expression)
        wrapped ||= knownWrapper
        opaque ||= !knownWrapper
      }
      if (ts.isVariableDeclaration(ancestor)) {
        if (ts.isIdentifier(ancestor.name)) name = ancestor.name.text
        break
      }
      ancestor = ancestor.parent
    }
    return { name, opaque, wrapped }
  }

  /** Detects component returns for {@link indexFunctions} without entering nested callbacks. @example returnsJSX(functionNode) */
  function returnsJSX(node) {
    let found = false
    function visit(child) {
      if (ts.isFunctionLike(child)) return
      if (
        ts.isJsxElement(child) ||
        ts.isJsxSelfClosingElement(child) ||
        ts.isJsxFragment(child)
      )
        found = true
      ts.forEachChild(child, visit)
    }
    function visitReturns(child) {
      if (ts.isFunctionLike(child)) return
      if (ts.isReturnStatement(child) && child.expression)
        visit(child.expression)
      else ts.forEachChild(child, visitReturns)
    }
    if (node.body && !ts.isBlock(node.body)) visit(node.body)
    else if (node.body) visitReturns(node.body)
    return found
  }

  /** Indexes implementations before references so {@link scanUses} is independent of declaration order. @example indexFunctions(source) */
  function indexFunctions(node, enclosing) {
    let current = enclosing
    if (ts.isFunctionLike(node) && node.body) {
      const source = node.getSourceFile()
      const info = fileInfo(source)
      const { name, opaque, wrapped } = bindingFor(node)
      current = {
        node,
        source,
        file: info.file,
        name: name || 'default',
        isHook: isCustomHookName(name),
        isComponent: wrapped || isPascalCase(name) || returnsJSX(node),
        target:
          !enclosing && !info.external && !info.verification && !info.generated,
        opaque,
        edges: new Set(),
        owners: new Set(),
        reason: undefined,
      }
      // TypeScript may include the same physical source through several symlink paths.
      const identity = `${info.file}:${node.getStart(source)}:${node.kind}`
      const existing = implementations.get(identity)
      if (existing && existing.source.text !== source.text) {
        throw new Error(
          `no-single-use-hook-file found conflicting compiler snapshots for ${info.file}; rebuild the complete typed project.`,
        )
      }
      current = existing || current
      implementations.set(identity, current)
      records.set(node, current)
    }
    ts.forEachChild(node, (child) => indexFunctions(child, current))
  }

  /** Includes source locations in incomplete results produced by {@link scanUses}. @example reasonAt(node, 'a Hook value escapes') */
  function reasonAt(node, reason) {
    const source = node.getSourceFile()
    const { line } = source.getLineAndCharacterOfPosition(node.getStart(source))
    return `${reason} at ${relative(root, fileInfo(source).file).replaceAll('\\', '/')}:${line + 1}`
  }

  // A configured but unreadable root cannot establish a complete application boundary.
  for (const filename of program.getRootFileNames()) {
    if (!program.getSourceFile(filename))
      throw new Error(
        `no-single-use-hook-file cannot analyze missing project source ${filename}.`,
      )
  }

  /** Rejects syntax errors before {@link buildOwnership} diagnoses missing imports or indexes active verification sources. @example assertParseable(source) */
  function assertParseable(source) {
    if (program.getSyntacticDiagnostics(source).length)
      throw new Error(
        `no-single-use-hook-file cannot analyze unparseable source ${source.fileName}; fix parser errors before linting.`,
      )
  }
  // Runtime syntax errors, including external consumers, can hide Hook uses and take precedence over import errors.
  for (const source of sources) {
    if (!fileInfo(source).verification) assertParseable(source)
  }

  // Runtime imports into verification files change them from ignored evidence to uncertain production paths.
  for (const source of sources) {
    const imports = []
    for (const statement of source.statements) {
      if (
        !(
          ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement)
        ) ||
        !statement.moduleSpecifier ||
        statement.importClause?.isTypeOnly ||
        statement.isTypeOnly
      )
        continue
      const bindings = ts.isImportDeclaration(statement)
        ? statement.importClause?.namedBindings
        : statement.exportClause
      // Inline type specifiers carry no runtime dependency, just like import type.
      if (
        bindings &&
        (ts.isNamedImports(bindings) || ts.isNamedExports(bindings)) &&
        bindings.elements.length &&
        bindings.elements.every((element) => element.isTypeOnly) &&
        !statement.importClause?.name
      )
        continue
      const module = symbolAt(statement.moduleSpecifier)
      const dependency = module?.declarations?.find(ts.isSourceFile)
      const specifier = statement.moduleSpecifier.text
      const local =
        specifier.startsWith('.') ||
        localPrefixes.some((prefix) => specifier.startsWith(prefix))
      if (
        (!dependency || dependency.isDeclarationFile) &&
        local &&
        !assetImport.test(specifier) &&
        !fileInfo(source).verification
      ) {
        if (
          !dependency ||
          (isWithin(root, canonicalPath(dependency.fileName)) &&
            !dependency.fileName.includes('node_modules'))
        ) {
          throw new Error(
            `no-single-use-hook-file needs complete runtime source for ${specifier} imported by ${source.fileName}; fix the typed project before linting.`,
          )
        }
      }
      if (dependency && !dependency.isDeclarationFile) imports.push(dependency)
    }
    dependencies.set(source, imports)
  }
  const dependencyQueue = sources.filter(
    (source) => !fileInfo(source).verification,
  )
  const visitedSources = new Set(dependencyQueue)
  for (let index = 0; index < dependencyQueue.length; index++) {
    for (const dependency of dependencies.get(dependencyQueue[index]) || []) {
      if (fileInfo(dependency).verification)
        importedVerification.add(dependency)
      if (!visitedSources.has(dependency)) {
        visitedSources.add(dependency)
        dependencyQueue.push(dependency)
      }
    }
  }
  const activeSources = sources.filter(
    (source) =>
      !fileInfo(source).verification || importedVerification.has(source),
  )
  /** Collects reassigned bindings before {@link resolveFunction} admits a definite owner edge. @example scanAssignments(source) */
  function scanAssignments(node) {
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
      node.operatorToken.kind <= ts.SyntaxKind.LastAssignment
    ) {
      function recordWrite(target) {
        if (ts.isIdentifier(target) || ts.isPropertyAccessExpression(target))
          assignedSymbols.add(symbolAt(target))
        else ts.forEachChild(target, recordWrite)
      }
      recordWrite(node.left)
    }
    ts.forEachChild(node, scanAssignments)
  }
  for (const source of activeSources) {
    // Only verification files still need their first syntax check after dependency activation.
    if (fileInfo(source).verification) assertParseable(source)
    scanAssignments(source)
  }
  for (const source of activeSources) indexFunctions(source)

  /** Seeds Hook and component identity from resolved bindings before {@link scanUses}. @example seedBindings(source) */
  function seedBindings(node) {
    if (
      ts.isIdentifier(node) &&
      (isCustomHookName(node.text) || isPascalCase(node.text))
    ) {
      const record = resolveFunction(node)
      if (record && isCustomHookName(node.text)) {
        if (!record.isHook) record.name = node.text
        record.isHook = true
      }
    }
    ts.forEachChild(node, seedBindings)
  }
  for (const source of activeSources) seedBindings(source)

  /** Ignores declaration/type transport while {@link scanUses} counts only actual runtime references. @example isTransport(identifier) */
  function isTransport(node) {
    let current = node
    // Property names belong to the complete access; Hook receivers such as useCart.call still escape.
    if (
      ts.isIdentifier(current) &&
      ts.isPropertyAccessExpression(current.parent) &&
      current.parent.name === current
    )
      return true
    while (current.parent) {
      const parent = current.parent
      if (
        (ts.isPropertyAccessExpression(parent) ||
          ts.isElementAccessExpression(parent)) &&
        parent.expression === current &&
        namespaceSymbol(current)
      )
        return true
      if (parent.expression === current && unwrap(parent) !== parent) {
        current = parent
        continue
      }
      if (
        ts.isTypeNode(parent) ||
        ts.isImportDeclaration(parent) ||
        ts.isExportDeclaration(parent)
      )
        return true
      if (
        (ts.isVariableDeclaration(parent) || ts.isFunctionLike(parent)) &&
        parent.name === current
      )
        return true
      if (ts.isCallExpression(parent) && parent.expression === current)
        return true
      if (ts.isExportAssignment(parent) && parent.expression === current)
        return true
      if (
        ts.isVariableDeclaration(parent) &&
        parent.initializer === current &&
        ts.isIdentifier(parent.name)
      ) {
        return Boolean(parent.parent.flags & ts.NodeFlags.Const)
      }
      if (ts.isExpression(parent) || ts.isStatement(parent)) return false
      current = parent
    }
    return false
  }

  /** Follows namespace aliases before {@link protectNamespace} protects escaping exports. @example namespaceSymbol(namespaceAlias) */
  function namespaceSymbol(expression, seen = new Set(), staticOnly = false) {
    const node = unwrap(expression)
    if (!node || seen.has(node)) return undefined
    seen.add(node)
    if (
      staticOnly &&
      (ts.isPropertyAccessExpression(node) ||
        ts.isElementAccessExpression(node)) &&
      !namespaceSymbol(node.expression, seen, true)
    )
      return undefined
    const symbol = symbolAt(node)
    if (staticOnly && assignedSymbols.has(symbol)) return undefined
    if (symbol?.flags & ts.SymbolFlags.Module) return symbol
    for (const declaration of symbol?.declarations || []) {
      if (
        staticOnly &&
        (!ts.isVariableDeclaration(declaration) ||
          !(declaration.parent.flags & ts.NodeFlags.Const))
      )
        continue
      const module = namespaceSymbol(declaration.initializer, seen, staticOnly)
      if (module) return module
    }
    return undefined
  }

  /** Keeps import type information for named and default exports inspected by {@link runtimeExportTargets}. @example runtimeBindingTargets(importSymbol, new Map()) */
  function runtimeBindingTargets(local, seen) {
    const targets = new Set()
    for (const binding of local?.declarations || []) {
      if (
        ts.isImportSpecifier(binding) ||
        ts.isImportClause(binding) ||
        ts.isNamespaceImport(binding)
      ) {
        const clause = ts.isImportClause(binding)
          ? binding
          : ts.isImportSpecifier(binding)
            ? binding.parent.parent
            : binding.parent
        if (binding.isTypeOnly || clause.isTypeOnly) continue
        if (ts.isNamespaceImport(binding)) {
          targets.add(checker.getAliasedSymbol(local))
          continue
        }
        for (const target of runtimeExportTargets(
          symbolAt(clause.parent.moduleSpecifier),
          ts.isImportClause(binding)
            ? ts.InternalSymbolName.Default
            : ((binding.propertyName || binding.name).escapedText ??
                (binding.propertyName || binding.name).text),
          seen,
        ))
          targets.add(target)
      } else if (local.flags & ts.SymbolFlags.Value) targets.add(local)
    }
    return targets
  }

  /** Resolves value export paths for {@link protectNamespace} when the checker flattens or shadows them with types. @example runtimeExportTargets(moduleSymbol, exported.escapedName) */
  function runtimeExportTargets(symbol, name, seen = new Map()) {
    const targets = new Set()
    if (!symbol || seen.get(symbol)?.has(name)) return targets
    if (!seen.has(symbol)) seen.set(symbol, new Set())
    seen.get(symbol).add(name)
    const direct = symbol.exports?.get(name)
    for (const declaration of direct?.declarations || []) {
      if (ts.isExportSpecifier(declaration)) {
        const statement = declaration.parent.parent
        if (declaration.isTypeOnly || statement.isTypeOnly) continue
        // Named forwarding can end at a type-only barrel despite value-shaped syntax.
        if (statement.moduleSpecifier) {
          for (const target of runtimeExportTargets(
            symbolAt(statement.moduleSpecifier),
            (declaration.propertyName || declaration.name).escapedText ??
              (declaration.propertyName || declaration.name).text,
            seen,
          ))
            targets.add(target)
          continue
        }
        for (const target of runtimeBindingTargets(
          checker.getExportSpecifierLocalTargetSymbol(declaration),
          seen,
        ))
          targets.add(target)
        continue
      }
      if (ts.isNamespaceExport(declaration)) {
        if (!declaration.parent.isTypeOnly)
          targets.add(checker.getAliasedSymbol(direct))
      } else if (direct.flags & ts.SymbolFlags.Value) targets.add(direct)
      else if (ts.isExportAssignment(declaration)) {
        for (const target of runtimeBindingTargets(
          checker.getSymbolAtLocation(unwrap(declaration.expression)),
          seen,
        ))
          targets.add(target)
      }
    }
    // Explicit value exports shadow stars; type-only exports do not, and stars never export default.
    if (targets.size || name === ts.InternalSymbolName.Default) return targets
    for (const declaration of symbol.declarations || []) {
      for (const statement of declaration.statements ||
        declaration.body?.statements ||
        []) {
        if (
          ts.isExportDeclaration(statement) &&
          !statement.isTypeOnly &&
          !statement.exportClause &&
          statement.moduleSpecifier
        ) {
          for (const target of runtimeExportTargets(
            symbolAt(statement.moduleSpecifier),
            name,
            seen,
          ))
            targets.add(target)
        }
      }
    }
    return targets
  }

  /** Marks escaped namespace targets uncertain during {@link scanUses}; exports are transport, not owners. @example protectNamespace(namespaceSymbol(expression), expression) */
  function protectNamespace(
    symbol,
    node,
    seen = new Set(),
    reason = 'a dynamic or escaped namespace may consume this Hook',
  ) {
    if (!symbol || seen.has(symbol)) return
    seen.add(symbol)
    for (const exported of checker.getExportsOfModule(symbol)) {
      for (const target of runtimeExportTargets(symbol, exported.escapedName)) {
        if (!target) continue
        if (target.flags & ts.SymbolFlags.Module)
          protectNamespace(target, node, seen, reason)
        for (const declaration of target.declarations || []) {
          const record =
            records.get(declaration) ||
            resolveFunction(declaration.initializer || declaration.expression)
          if (record?.isHook) record.reason ||= reasonAt(node, reason)
        }
      }
    }
  }

  /** Preserves opaque module consumers during {@link scanUses}; compiler resolution bounds require() uncertainty. @example protectModuleLoad(requireCall) */
  function protectModuleLoad(node) {
    const specifier = node.arguments[0]
    let module = specifier && namespaceSymbol(specifier)
    let resolvedSource
    if (!module && specifier && ts.isStringLiteralLike(specifier)) {
      if (assetImport.test(specifier.text)) return
      const resolution = ts.resolveModuleName(
        specifier.text,
        node.getSourceFile().fileName,
        options,
        ts.sys,
      ).resolvedModule
      resolvedSource =
        resolution && program.getSourceFile(resolution.resolvedFileName)
      module = resolvedSource && checker.getSymbolAtLocation(resolvedSource)
      if (
        !module &&
        !specifier.text.startsWith('.') &&
        !localPrefixes.some((prefix) => specifier.text.startsWith(prefix))
      )
        return
    }
    if (module) protectNamespace(module, node)
    // A runtime loader's incomplete exports must not erase known Hooks in its source.
    for (const record of implementations.values()) {
      if (record.isHook && (!module || record.source === resolvedSource))
        record.reason ||= reasonAt(
          node,
          'an opaque module load may consume this Hook',
        )
    }
  }

  /** Records nearest-function call edges and opaque uses for {@link buildOwnership}. @example scanUses(source) */
  function scanUses(node, enclosing) {
    const current = records.get(node) || enclosing
    if (ts.isCallExpression(node)) {
      // Dynamic module consumers can escape through destructuring or unresolved Promise types.
      if (
        node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) && node.expression.text === 'require')
      )
        protectModuleLoad(node)
      const target = resolveFunction(node.expression)
      if (target?.isHook) {
        if (resolveFunction(node.expression, new Set(), true) !== target)
          target.reason ||= reasonAt(
            node,
            'a callable binding can be reassigned',
          )
        else if (current?.isHook || current?.isComponent)
          current.edges.add(target)
        else
          target.reason ||= reasonAt(
            node,
            'a caller is not a recognized component or Hook',
          )
      }
    }
    if (
      ts.isElementAccessExpression(node) &&
      !ts.isStringLiteralLike(node.argumentExpression)
    )
      protectNamespace(namespaceSymbol(node.expression), node)
    if (
      (ts.isIdentifier(node) ||
        ts.isPropertyAccessExpression(node) ||
        ts.isElementAccessExpression(node)) &&
      !isTransport(node)
    ) {
      const record = resolveFunction(node)
      if (record?.isHook)
        record.reason ||= reasonAt(
          node,
          'the Hook value escapes a statically resolved call',
        )
      else if (record?.isComponent) {
        let argument = node
        while (
          argument.parent?.expression === argument &&
          unwrap(argument.parent) !== argument.parent
        )
          argument = argument.parent
        if (
          ts.isCallExpression(argument.parent) &&
          argument.parent.arguments.includes(argument) &&
          !reactWrapper(argument.parent.expression)
        ) {
          record.reason ||= reasonAt(
            node,
            'an unrecognized wrapper or callback may change component ownership',
          )
          record.owners.delete(record)
        }
      }
      if (!record) protectNamespace(namespaceSymbol(node), node)
    }
    ts.forEachChild(node, (child) => scanUses(child, current))
  }

  // Re-exporting from an exposed barrel protects the canonical Hook even without a local function body.
  for (const source of activeSources) {
    const info = fileInfo(source)
    if (info.external || info.public)
      protectNamespace(
        checker.getSymbolAtLocation(source),
        source,
        new Set(),
        'an exposed package export may have consumers outside this application',
      )
  }
  // Exposed Hooks protect their complete helper chain, even when an app observes just one consumer.
  for (const record of implementations.values()) {
    const info = fileInfo(record.source)
    if (
      info.external ||
      importedVerification.has(record.source) ||
      record.opaque
    ) {
      record.reason ||= reasonAt(
        record.node,
        info.external
          ? 'ownership crosses the configured application package boundary'
          : record.opaque
            ? 'an unrecognized wrapper encloses this implementation'
            : 'production imports a verification-only module',
      )
    }
    if (record.isComponent && !record.isHook && !record.reason)
      record.owners.add(record)
  }
  for (const source of activeSources) scanUses(source)

  // Monotone propagation terminates on cycles; two witnesses suffice to prove shared ownership.
  const queue = [...implementations.values()]
  const pending = new Set(queue)
  for (let index = 0; index < queue.length; index++) {
    const caller = queue[index]
    pending.delete(caller)
    for (const target of caller.edges) {
      let changed = false
      if (caller.reason && !target.reason) {
        target.reason = caller.reason
        changed = true
      }
      for (const owner of caller.owners) {
        if (target.owners.size < 2 && !target.owners.has(owner)) {
          target.owners.add(owner)
          changed = true
        }
      }
      if (changed && !pending.has(target)) {
        pending.add(target)
        queue.push(target)
      }
    }
  }
  return {
    root,
    files: new Map([...metadata].map(([source, info]) => [source, info.file])),
    hooks: [...implementations.values()].filter((record) => record.isHook),
  }
}
