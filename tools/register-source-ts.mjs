// Node 24's native TypeScript stripping receives the exact .ts modules. The
// project normally resolves extensionless imports through its bundler; this
// small read-only resolver supplies those same file paths to native Node.
import { registerHooks } from 'node:module';
registerHooks({
  resolve(specifier, context, nextResolve) {
    try { return nextResolve(specifier, context); }
    catch (error) {
      if (error.code === 'ERR_MODULE_NOT_FOUND' && specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)) {
        return nextResolve(specifier + '.ts', context);
      }
      throw error;
    }
  }
});
