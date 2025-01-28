'use strict';

const repl = require("repl");
const fs = require("fs");
module.exports = {

	buildDirectory: '_build',
	contentDirectory: './',
	verboseOutput: false,
	skippedItems: ['node_modules'], // directories and files to skip in copy,
	languages: ['bash','php','velocity','xml','ini'],
	packageVersion: 'unknown-version',
	replacementObj: [],

	UpdateVersion: function (v) {
		module.exports.packageVersion = v;
	},

	/**
	 * Determines if the site has been built yet by looking at index file existence.
	 * @param dir
	 * @returns {boolean}
	 * @constructor
	 */
	HasBeenBuilt: function (dir) {
		let fs = require('fs');
		return (fs.existsSync(dir+"/index.html"));
	},

	MakeDirectory: function (dir) {
		module.exports.OutputVerbose('Creating directory '+dir);
		let fs = require('fs');
		if (fs.existsSync(dir)){
			module.exports.OutputVerbose('   Directory exists, so wiping contents.')
			fs.rmSync(dir, {recursive: true});
		}
		fs.mkdirSync(dir);
	},

	ReadFile: function (filePath) {
		let fs = require('fs');
		if (!fs.existsSync(filePath)) { return null; }
		return fs.readFileSync(filePath,{ encoding: 'utf8' });
	},

	WriteFile: function (filePath, contents) {
		let fs = require('fs');
		fs.writeFileSync(filePath, contents);
	},

	CopyFile: function (sourceFilePath, destFilePath) {
		let fs = require('fs');
		fs.copyFileSync(sourceFilePath, destFilePath);
	},

	DoReplacements: function (content) {
		Object.entries(this.replacementObj).forEach(([k, v]) => {
			content = content.replaceAll('{{'+k+'}}', v);
		})
		return content;
	},

	/**
	 * left=right -> returns 0
	 * left<right -> returns -1
	 * left>right -> returns 1
	 * @param left
	 * @param right
	 * @returns {number}
	 * @constructor
	 */
	VersionCompare: function(left, right) {
		let v_l = left.split('.');
		let major_l = v_l[0];
		let minor_l = v_l[1];
		let patch_l = v_l[2];

		let v_r = right.split('.');
		let major_r = v_r[0];
		let minor_r = v_r[1];
		let patch_r = v_r[2];

		if (major_l === major_r) {
			if (minor_l === minor_r) {
				if (patch_l === patch_r) {
					return 0;
				}
				return (patch_l > patch_r ? 1 : -1);
			}
			return (minor_l > minor_r ? 1 : -1);
		}
		return (major_l > major_r ? 1 : -1);

	},

	GetBodyClasses: function () {
		let classes = [];

		// All versions that need body classes
		let versionDifferences = ['0.1.4'];

		let self = this;
		versionDifferences.forEach(function(v) {
			const vc = self.VersionCompare(self.packageVersion, v);
			if (vc >= 0) {
				classes.push(v);
			}
		});

		return classes;
	},

	Initialize: function (projectName) {

		let self = this;

		let embeds = '';
		module.exports.languages.forEach(l => {
			embeds += '<script src="//cdn.jsdelivr.net/npm/prismjs@1/components/prism-' + l + '.min.js"></script>';
		});

		let bodyClasses = this.GetBodyClasses();
		let bodyClassesString = '';
		bodyClasses.forEach(function(v) {
			bodyClassesString += ' v-' + v.replaceAll('.','_');
		});

		this.replacementObj = {
			['name']: projectName,
			['highlights']: embeds,
			['body-version-class']: bodyClassesString
		};

		console.log('Initializing doc-site project...');

		module.exports.MakeDirectory(module.exports.buildDirectory);

		let contents = module.exports.ReadFile(__dirname + '/templates/docsify/index.html');

		// Replacements
		contents = module.exports.DoReplacements(contents);

		module.exports.WriteFile(module.exports.buildDirectory + '/index.html', contents);

		// Default README file
		contents = module.exports.ReadFile(__dirname + '/templates/docsify/README.md');
		contents = module.exports.DoReplacements(contents);
		module.exports.WriteFile(module.exports.buildDirectory + '/README.md', contents);

		module.exports.CopyFile(__dirname + '/templates/docsify/theme-overrides.css', module.exports.buildDirectory + '/theme-overrides.css');

		//self::_MakeDir('./.github');
		//self::_MakeDir('./.github/workflows');
		//copy(__DIR__.'/../templates/.github/workflows/static.yml', './.github/workflows/static.yml');

	},

	OutputVerbose: function(val) {
		if (module.exports.verboseOutput) {
			console.log(val);
		}
	},

	CopyDirectoryAndContents: function(source, dest) {
		module.exports.OutputVerbose('Copying files from ' + source + ' to ' + dest);

		let fs = require('fs');

		let files = fs.readdirSync(source);

		files.forEach(file => {

			let doCopy = true;

			if (file.startsWith('.') || file.startsWith('_')) {
				module.exports.OutputVerbose('   Skipping hidden file/dir - '+file);
				doCopy = false;
			} else if (module.exports.skippedItems.includes(file)) {
				module.exports.OutputVerbose('   Skipping excluded file/dir - '+file);
				doCopy = false;
			}

			if (doCopy) {
				let fullPath = source + '/' + file;
				let isDir = fs.lstatSync(fullPath).isDirectory();

				if (isDir) {
					module.exports.OutputVerbose('  Recursive copy of directory '+file);
					module.exports.OutputVerbose('-----');
					module.exports.MakeDirectory(dest + "/" + file);
					module.exports.CopyDirectoryAndContents(fullPath, dest + "/" + file);
					module.exports.OutputVerbose('-----');
				} else if (file.endsWith('.md')) {
					module.exports.OutputVerbose('   Copying file ' + file);
					module.exports.CopyFile(fullPath, dest + "/" + file);
				} else if (file.endsWith('.png')) {
					module.exports.OutputVerbose('   Copying image file ' + file);
					module.exports.CopyFile(fullPath, dest + "/" + file);
				} else {
					module.exports.AttemptCreateMarkdownLanguageFile(fullPath, dest + "/" + file + ".md");
					//module.exports.OutputVerbose('   Skipping unknown file type ' + fullPath);
				}
			}
		});
	},

	AttemptCreateMarkdownLanguageFile: function(sourcePath, destPath) {

		const validExtensions = ['xml', 'vm', 'php', 'ini', 'txt'];
		const mdLanguageTags = ['xml', 'velocity', 'php', 'ini', ''];
		const undef = '';

		let split = sourcePath.split('.');
		let ext = split[split.length-1].toLowerCase();

		split = sourcePath.split('/');
		let filename = split[split.length-1];

		//console.log(filename + " - " + sourcePath + ' - ' + ext);

		if (!filename.startsWith('~') && !validExtensions.includes(ext)) { return; }

		let mdLanguageTag = mdLanguageTags[validExtensions.findIndex(function (ele) { return ele === ext; })];

		if (mdLanguageTag === undefined) {
			mdLanguageTag = undef;
		}

		let contents = module.exports.ReadFile(sourcePath);

		contents = '# '+filename.replace('~','')+'\n```' + mdLanguageTag + "\n" + contents + "\n```";
		module.exports.WriteFile(destPath, contents);

	},

	CopyDocumentsToBuild: function() {

		let dir = process.cwd();
		let build = process.cwd() + '/' + module.exports.buildDirectory;
		module.exports.CopyDirectoryAndContents(dir, build);

		//fs.cpSync(__dirname, module.exports.buildDirectory, {recursive: true});
	},

	GetFileDisplayName: function(file) {

		if (file.startsWith('~')) {
			file = file
				.replaceAll('.md','')
				.replaceAll('.MD','');
			return "📄 " + file.replace('~','');
		}

		// Basic replacements
		file = file
			.replaceAll('.md','')
			.replaceAll('.MD','')
			.replaceAll('-',' ')
			.replaceAll('_',' ');

		// Is it a file?
		if (file.includes('.')) {
			file = "📄 " + file.substring(0, file.lastIndexOf('.'));
		}

		// Capitalize first letters
		let words = file.split(" ");
		for (let i = 0; i < words.length; i++) {
			words[i] = words[i][0].toUpperCase() + words[i].substring(1);
		}
		file = words.join(' ');

		return file;

	},

	GetFolderSidebar: function(dirPath, indent = 0) {

		// Prefix with correct spacing, working against indent-1 so landing page is not indent (we fix this later)
		let prefix = '';
		for (let i = 0; i < indent-1; i++) {
			prefix += '  ';
		}

		let fs = require('fs');
		let isDir = fs.lstatSync(dirPath).isDirectory();

		if (!isDir) { return []; }


		let contents = [];

		let split = dirPath.split('/');
		let dirJustFolder = split[split.length-1];
		let rootDir = process.cwd() + '/' + module.exports.buildDirectory + '/';
		let dir = dirPath.replace(rootDir, '');

		let displayName = module.exports.GetFileDisplayName(dirJustFolder);

		// Landing Page?
		if (fs.existsSync(dirPath + "/README.md")) {
			contents.push(prefix + "- ["+displayName+"]("+dir+"/README.md)");
			//Output::Verbose("\t\t✅ Added index file for {$filename}");
		} else {
			module.exports.CopyFile(__dirname+'/templates/docsify/default-index.md', dirPath + "/README.md");
			//contents.push("- [📁 "+displayName+"]("+file+"/README.md)");
			contents.push(prefix + "- 📁 "+displayName);
			//Output::Error("Docsify directory {$file} does not have a README.md index file.");
		}

		// Don't want to indent landing page
		if (indent > 0) { prefix += '  '; }

		let files = fs.readdirSync(dirPath);
		files.forEach(file => {

			let displayName = module.exports.GetFileDisplayName(file);
			let fullPath = dirPath + "/" + file;
			let isDir = fs.lstatSync(fullPath).isDirectory();
			if (!isDir && file.toLowerCase() !== 'readme.md') {
				//Output::Verbose("\t\t✅ Nested File: {$nestedFilename}");
				//$dn = self::_GetDisplayName($nestedFilename);
				let displayName = module.exports.GetFileDisplayName(file);
				contents.push(prefix+"  - ["+displayName+"]("+dir+"/"+file+")");
			} else if (isDir) {
				let nested = module.exports.GetFolderSidebar(dirPath + "/" + file, (indent + 2));
				contents = contents.concat(nested);
			}



			// Grab files from directory. We only care about one level deep
			//foreach (array_diff(scandir($file), ['..','.', 'README.md']) as $nestedFilename) {

			// let nestedFiles = fs.readdirSync(fullPath);
			//
			// nestedFiles.forEach(nFile => {
			//
			// 	let nFullPath = dir + "/" + file + "/" + nFile;
			// 	let isDir = fs.lstatSync(nFullPath).isDirectory();
			// 	if (!isDir && nFile.toLowerCase() !== 'readme.md') {
			// 		//Output::Verbose("\t\t✅ Nested File: {$nestedFilename}");
			// 		//$dn = self::_GetDisplayName($nestedFilename);
			// 		let displayName = module.exports.GetFileDisplayName(nFile);
			// 		contents.push("  - ["+displayName+"]("+file+"/"+nFile+")");
			// 	}
			// });

		});

		return contents;

	},

	BuildSidebar: function() {

		let fs = require('fs');

		console.log('Building sidebar...')

		let contents = [];
		let exclusions = ['README.md'];
		contents.push('- [Overview](README)');

		let dir = process.cwd() + '/' + module.exports.buildDirectory;

		let files = fs.readdirSync(dir);

		files.forEach(file => {

			let fullPath = dir + "/" + file;
			let isDir = fs.lstatSync(fullPath).isDirectory();

			//if (is_file($file) && str_ends_with($file, '.md')) {
			if (!isDir && file.endsWith('.md') && file !== 'README.md') {

				//Output::Verbose("\t\t✅ File added to sidebar!");
				if (exclusions.includes(file)) {
					// If the file is a nested README, treat it as the folder index
					let displayName = '';
					if (fullPath.toLowerCase() === 'readme.md') {
						let split = fullPath.split('/');
						displayName = split[split.length - 2];
						displayName = module.exports.GetFileDisplayName(displayName);
						//$dn = $e[count($e)-2];
					} else {
						//$dn = self::_GetDisplayName($bn);
						displayName = module.exports.GetFileDisplayName(file);
					}
					contents.push("- [" + displayName + "](" + fullPath + ")");
				} else {
					let displayName = module.exports.GetFileDisplayName(file);
					contents.push("- [" + displayName + "](" + file + ")");
				}


				//} elseif (is_dir($file) && !in_array($filename, ['img'])) {
			} else if (isDir && !['img','docs'].includes(file)) {

				contents = contents.concat(module.exports.GetFolderSidebar(fullPath));

			}
		});

		contents.push('');
		contents.push('');

		const v = module.exports.packageVersion;
		contents.push('<div id=\'sidebar-version\'>');
		if (!v.includes('unknown')) {
			contents.push('Built with @barkleyrei/doc-site version '+v+'<br/>');
		}

		const now = new Date();
		const year = now.getFullYear();
		const month = (now.getMonth() + 1).toString().padStart(2, '0'); // JavaScript months are 0-indexed
		const day = now.getDate().toString().padStart(2, '0');
		const hours = now.getHours().toString().padStart(2, '0');
		const minutes = now.getMinutes().toString().padStart(2, '0');
		const seconds = now.getSeconds().toString().padStart(2, '0');

		contents.push(`Last Updated: ${year}-${month}-${day} ${hours}:${minutes}:${seconds}`);
		contents.push('</div>');

		// $short = Version::ConvertToShortVersion($version);
		// $contents[] = "<div id='sidebar-version'>Documentation built for version <strong>{$short}</strong>";
		// if ($createPharVersion !== null) {
		// 	$contents[] = "<br/>Built with create-phar version <strong>{$createPharVersion}</strong>";
		// }
		// $contents[] .= '</div>';



		let content_string = this.DoReplacements(contents.join("\n"));
		module.exports.WriteFile(module.exports.buildDirectory + "/_sidebar.md", content_string);

	},

	AddGitHubWorkflow: function() {
		let dir = process.cwd() + '/' + module.exports.buildDirectory;
		module.exports.MakeDirectory(process.cwd() + '/.github');
		module.exports.MakeDirectory(process.cwd() + '/.github/workflows');
		module.exports.CopyFile(__dirname+'/templates/.github/workflows/static.yml', process.cwd() + "/.github/workflows/static.yml");
	}

}
