# Laravel Extra Intellisense

This extension adds [laravel](https://laravel.com/) routes, views and ... autocomplete to [VSCode](https://code.visualstudio.com/).

![Screen Shot](/images/screenshot.gif)

## Autocomplete
* Route names and route parameters
* Views
* Configs
* Translations and translation parameters
* Laravel mix function
* Validation rules
* View sections

## Configuration
### LaravelExtraIntellisense.customValidationRules:
Your custom validation rules snippets.

Example:
```json
"LaravelExtraIntellisense.customValidationRules": {
    "mobile": "mobile",
    "distance_gt": "distance_gt:${0:1km}"
}
```

## Release Notes

### 0.2.6
* Blade stack autocomplete added.
* Duplicate section autocomplete items fixed.
* PHP commands converted to async functions to prevent unresponsive extension host error.

### 0.2.4
* Blade section autocomplete added.

### 0.2.3
* View parameters autocomplete.
* Route autocomplete bug in linux fixed.

### 0.2.2
* Auto-Retry removed from all providers. causes some performance issues.
* Disable logging added.

### 0.2.1
* `markdown` function added to view functions for autocomplete.
* Using file watcher instead of save event. Better change detect for view autocomplete.
* json translation autocomplete added.

### 0.2.0
Validation rules autocomplete added.
works with `Validator` class, `validate` functions and inside request classes.

### 0.1.5
Route action autocomplete added. `Route::get`, `Route::post`,... autocompletes controller actions inside app\Http\Controllers.

### 0.1.2 - 0.1.4
Performance improvments.

### 0.1.1
Add mix autocomplete.

### 0.1.0
Fix problems with linux.
Add translation autocomplete.
Improved providers.

### 0.0.6
Config autocomplete added.

### 0.0.5
Route bug fix.

### 0.0.4
View names with namespaces ready to use.

### 0.0.3
View functions autocompelete added.

### 0.0.2
Blade bug fix.

### 0.0.1
Add route autocomplete.


## Recommended extensions
* [PHP Intelephense](https://marketplace.visualstudio.com/items?itemName=bmewburn.vscode-intelephense-client)
* [PHPCS](https://marketplace.visualstudio.com/items?itemName=ikappas.phpcs)
* [PHP DocBlocker](https://marketplace.visualstudio.com/items?itemName=neilbrayfield.php-docblocker)
* [PHP formatter](https://marketplace.visualstudio.com/items?itemName=kokororin.vscode-phpfmt)
* [Laravel Blade Snippets](https://marketplace.visualstudio.com/items?itemName=onecentlin.laravel-blade)
* [Laravel goto view](https://marketplace.visualstudio.com/items?itemName=codingyu.laravel-goto-view)
* [Laravel goto controller](https://marketplace.visualstudio.com/items?itemName=stef-k.laravel-goto-controller)

## Credits
* [PHP parser](https://github.com/glayzzle/php-parser)
