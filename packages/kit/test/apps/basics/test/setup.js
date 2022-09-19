import fs from 'fs';

process.chdir('src/routes/routing');
fs.rmSync('symlink-from', { recursive: true, force: true });
fs.symlinkSync('symlink-to', 'symlink-from', 'dir');
