With just Markdown files (`.md`), you can have a fully functional documentation site using the magic of [Docsify](https://github.com/docsifyjs/docsify). **doc-site** has additional logic built on 
top of it to ensure consistent formatting between BarkleyOKRP development team documentation. 

Additionally, **doc-site** handles some basic template replacements, and logic to translate code files into standalone displays.

## Quick Start

**doc-site** is hosted on NPM for easy installation and runs - https://www.npmjs.com/package/@barkleyrei/doc-site

- Install **doc-site**: `npm install @barkleyrei/doc-site`
- Initialize **doc-site** in a folder with your documentation: `dsb-init`
- Add GitHub workflow files to auto-deploy to GitHub page on publish: `dsb-ghw`
- Build your **doc-site**: `dsb` or `dsb-build
- Run your **doc-site** locally: `dsb-serve`

## Content Building

Root folder's `README.md` is treated as the "homepage" for the **doc-site**, so build out some basic information about your project/doc there. 

Although not required, a `README.md` file in nested folders are treated as the landing page for that directory.

A variety of files, based on extensions, will be built out to their own stand-alone page, with formatting, within the **doc-site**. The following files are supported for this formatting:

- **XML** (`.xml` extensions)
- **Velocity** (`.vm` extensions)
- **PHP** (`.php` extensions)
- **INI** (`.ini extensions)

**doc-site** renames some files during build for display within the folder structure. If you want to bypass this, prefix your file with a `~` character. For example, `~.htaccess`.

## Styling

For styles, refer to the private [BarkleyOKRP Identity Repository](https://github.com/BarkleyREI/identity).
