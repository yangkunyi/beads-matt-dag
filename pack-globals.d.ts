/**
 * Bun runtime members, declared for the pack's typecheck (tsconfig.pack.json) and nowhere else.
 *
 * The pack runs under bun, which declares these; tsc does not, and this repository has no bun type package
 * to depend on. The pack itself must not carry this file - it is copied to ~/.archon/workflows/, where the
 * typecheck does not run.
 */
interface ImportMeta {
  /** Bun: the directory of the module being run. */
  dir: string;
  /** Bun: true when this module is the process entry point. */
  main: boolean;
}

/** Bun's YAML parser. The pack runs under bun; tsc has no bun type package. */
declare namespace Bun {
  namespace YAML {
    function parse(input: string): unknown;
  }
}
