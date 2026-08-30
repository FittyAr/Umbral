import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateRepoUrl,
  validateBranch,
  validateSubpath,
  validatePrefix,
  IconPackInputError,
} from '../src/lib/icon-packs/validate.ts';

describe('validateRepoUrl', () => {
  it('accepts a normal https URL', () => {
    assert.equal(validateRepoUrl('https://github.com/user/repo'), 'https://github.com/user/repo');
  });

  it('accepts http', () => {
    assert.equal(validateRepoUrl('http://example.com/repo'), 'http://example.com/repo');
  });

  it('rejects URLs starting with --', () => {
    assert.throws(() => validateRepoUrl('--upload-pack=evil'), IconPackInputError);
  });

  it('rejects ext:: transport', () => {
    assert.throws(() => validateRepoUrl('ext::sh -c "id"'), IconPackInputError);
  });

  it('rejects file:// protocol', () => {
    assert.throws(() => validateRepoUrl('file:///etc/passwd'), IconPackInputError);
  });

  it('rejects URLs with credentials', () => {
    assert.throws(() => validateRepoUrl('https://user:pass@host/repo'), IconPackInputError);
  });

  it('rejects scp-like git URLs', () => {
    // `git@github.com:user/repo.git` no es una URL válida para `new URL`.
    assert.throws(() => validateRepoUrl('git@github.com:user/repo.git'), IconPackInputError);
  });
});

describe('validateBranch', () => {
  it('returns main for empty input', () => {
    assert.equal(validateBranch(undefined), 'main');
    assert.equal(validateBranch(''), 'main');
    assert.equal(validateBranch('  '), 'main');
  });

  it('accepts valid branch names', () => {
    assert.equal(validateBranch('main'), 'main');
    assert.equal(validateBranch('feature/my-branch'), 'feature/my-branch');
    assert.equal(validateBranch('v1.2.3'), 'v1.2.3');
  });

  it('rejects branches starting with -', () => {
    assert.throws(() => validateBranch('--upload-pack=evil'), IconPackInputError);
  });

  it('rejects branches with ..', () => {
    assert.throws(() => validateBranch('a..b'), IconPackInputError);
  });

  it('rejects branches with spaces', () => {
    assert.throws(() => validateBranch('a b'), IconPackInputError);
  });
});

describe('validateSubpath', () => {
  it('returns undefined for empty input', () => {
    assert.equal(validateSubpath(undefined), undefined);
    assert.equal(validateSubpath(''), undefined);
  });

  it('accepts valid subpaths', () => {
    assert.equal(validateSubpath('icons'), 'icons');
    assert.equal(validateSubpath('path/to/icons'), 'path/to/icons');
    assert.equal(validateSubpath('/leading/slash/'), 'leading/slash');
  });

  it('rejects path traversal', () => {
    assert.throws(() => validateSubpath('../etc/passwd'), IconPackInputError);
    assert.throws(() => validateSubpath('a/../../b'), IconPackInputError);
  });

  it('rejects segments starting with -', () => {
    assert.throws(() => validateSubpath('-evil'), IconPackInputError);
  });

  it('rejects dot segments', () => {
    assert.throws(() => validateSubpath('.'), IconPackInputError);
    assert.throws(() => validateSubpath('..'), IconPackInputError);
  });
});

describe('validatePrefix', () => {
  it('returns undefined for empty input', () => {
    assert.equal(validatePrefix(undefined), undefined);
    assert.equal(validatePrefix(''), undefined);
  });

  it('accepts valid prefixes', () => {
    assert.equal(validatePrefix('my-pack'), 'my-pack');
    assert.equal(validatePrefix('ABC'), 'abc');
  });

  it('rejects prefixes with special characters', () => {
    assert.throws(() => validatePrefix('a b'), IconPackInputError);
    assert.throws(() => validatePrefix('a/b'), IconPackInputError);
  });

  it('rejects prefixes over 24 chars', () => {
    assert.throws(() => validatePrefix('a'.repeat(25)), IconPackInputError);
  });
});
