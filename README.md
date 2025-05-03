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
v2 should extend null support for both token colors scopes.
at the directory level. keep both v1 and v2-v<i>
further versions could introduce more features...
tags/releases in this project should correspond to vscode releases, e.g. vscode-v1.99.0
-->

## Credit

@wraith13 for [save-vscode-schemas](https://github.com/wraith13/save-vscode-schemas), which retrieves VS Code's internal JSON Schemas (`vscode://schemas/*`).

## License

MIT © Víctor González Prieto
