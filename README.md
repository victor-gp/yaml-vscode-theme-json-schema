# JSON Schema for YAML VS Code Themes

JSON Schema files for VS Code themes written in YAML, with the extra features supported in projects like [Dracula for Visual Studio Code](https://github.com/dracula/visual-studio-code) and [Lucario Theme for VS Code](https://github.com/victor-gp/lucario-vscode-theme).

## Motivation

The `color-theme` set of JSON Schemas from VS Code provide great Intellisense while developing a JSON VS Code theme. They properly describe each themable element in the workbench, provide useful snippets for many properties, etc.

YAML files can validate with JSON Schemas alright, so YAML themes are theoretically able to benefit from that wealth of Intellisense hints.
But the VS Code schemas are not applicable for a couple of reasons:

1. They're served on a `vscode://` URI, which is not accessible for the [YAML extension](https://github.com/redhat-developer/vscode-yaml) that provides JSON Schema validation for YAML files.
2. Even if they were accessible, they don't include support for the extra features that YAML VS Code themes can use, so we'd get a needless array of validation errors.

This project provides schemas that solve both these issues.

## Extra features

These are the extra features afforded to YAML themes:

- anchors (`&`) and aliases (`*`): define a color or style once and reference it by name everyhwere else, like variables.
  - this is out-of-the-box for YAML to JSON conversion, it doesn't require any schema modifications.

  ```yaml
  &Accent   "#5c98cd"
  # ...
  activityBar.activeBorder: *Accent
  ```

- comments: you can use comments all throughout the file and they'll be stripped away from the delivered `.json` file.
  - this is also out-of-the-box.

  ```yaml
  # Reference: https://code.visualstudio.com/api/references/theme-color
  ```

- color properties can take `!alpha` custom tags, which are transformed into `#rrggbbaa`/`#rgba` at conversion time.

  ```yaml
  editorLineNumber.foreground: !alpha ['#ffffff', '80']
  ```

- some color properties can take null values, and then they are removed at conversion time.

  ```yaml
  icon.foreground: # default is ok
  ```

With the following support:

| Support            | !alpha | null |
|--------------------|--------|------|
| colors             | ✅     | ✅   |
| tokenColors        | ✅     | ❌   |
| semanticTokenColors| ✅     | ❌   |

Where:

- `colors`: Workbench (UI) elements
- `tokenColors`: code syntax, provided by default
- `semanticTokenColors`: code syntax, provided by a Language Server (extension)

<!--TODO version this feature support
this should be yaml-vscode-theme v1.
v2 should extend null support for both token colors scopes. maybe also fontStyle.
v3 could limit alpha values to strings only, adressing that blindspot in our schema. (this would be breaking for Dracula)
v0 could be just the vscode themes, without any extra features.
at the directory level. keep both v1 and v2-v<i>
further versions could introduce more features...
tags/releases in this project should correspond to vscode releases, e.g. vscode-v1.99.0
-->

## Development

- `save-vscode-schemas` (extension) gets the VS Code set of schemas, we filter the `color-theme` related ones.
  - The extension isn't available on the VS Marketplace. You have to clone it locally.
  - Then `npm i`, do `Debug: Start Debugging` and run the extension's command: `Save VS Code's Schemas`.
  - Copy the saved schemas into this project under `schemas/v0`.
- `patch-schemas.js` patches those schemas so they allow the extra features.
  - They take the base VS Code schemas in `v0/` and output the result in `v1`.

## Credit

@wraith13 for their VS Code schema-related projects:

- We used the schemas provided in [vscode-schemas](https://github.com/wraith13/vscode-schemas)  as the base for ours while the schemas still lived in [vscode-lucario-theme](https://github.com/victor-gp/lucario-vscode-theme).
- We're using the [save-vscode-schemas](https://github.com/wraith13/save-vscode-schemas) extension to retrieve them in this project.

## License

MIT © Víctor González Prieto
