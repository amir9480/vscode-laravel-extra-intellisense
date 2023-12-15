'use strict';

import * as vscode from 'vscode';
import Helpers from './helpers';


export default class ValidationProvider implements vscode.CompletionItemProvider {
    private rules: any = {
        accepted: "accepted",
        active_url: "active_url",
        after: "after:date",
        after_or_equal: "after_or_equal:${0:date}",
        alpha: "alpha",
        alpha_dash: "alpha_dash",
        alpha_num: "alpha_num",
        array: "array",
        bail: "bail",
        before: "before:${1:date}",
        before_or_equal: "before_or_equal:${1:date}",
        between: "between:${1:min},${2:max}",
        boolean: "boolean",
        confirmed: "confirmed",
        date: "date",
        date_equals: "date_equals:${1:date}",
        date_format: "date_format:${1:format}",
        different: "different:${1:field}",
        digits: "digits:${1:value}",
        digits_between: "digits_between:${1:min},${2:max}",
        dimensions: "dimensions",
        distinct: "distinct",
        email: "email",
        ends_with: "ends_with:${1}",
        exists: "exists:${2:table},${3:column}",
        file: "file",
        filled: "filled",
        gt: "gt:${1:field}",
        gte: "gte:${1:field}",
        image: "image",
        in: "in:${1:something},${2:something else}",
        in_array: "in_array:${1:anotherfield.*}",
        integer: "integer",
        ip: "ip",
        ipv4: "ipv4",
        ipv6: "ipv6",
        json: "json",
        lt: "lt:${1:field}",
        lte: "lte:${1:field}",
        max: "max:${1:value}",
        mimetypes: "mimetypes:${1:text/plain}",
        mimes: "mimes:${1:png,jpg}",
        min: "min:${1:value}",
        not_in: "not_in:${1:something},${2:something else}",
        not_regex: "not_regex:${1:pattern}",
        nullable: "nullable",
        numeric: "numeric",
        present: "present",
        regex: "regex:${1:pattern}",
        required: "required",
        required_if: "required_if:${1:anotherfield},${2:value}",
        required_unless: "required_unless:${1:anotherfield},${2:value}",
        required_with: "required_with:${1:anotherfield}",
        required_with_all: "required_with_all:${1:anotherfield},${2:anotherfield}",
        required_without: "required_without:${1:anotherfield}",
        required_without_all:
          "required_without_all:${1:anotherfield},${2:anotherfield}",
        same: "same:${1:field}",
        size: "size:${1:value}",
        sometimes: "sometimes",
        starts_with: "starts_with:${1:foo},${2:bar}",
        string: "string",
        timezone: "timezone",
        unique: "unique:${1:table},${2:column},${3:except},${4:id}",
        url: "url",
        uuid: "uuid",

        ascii: "ascii",
        current_password: "current_password:${1:api}",
        decimal: "decimal:${1:min},${2:max}",
        declined: "declined",
        declined_if: "declined_if:${1:anotherfield},${2:value}",
        doesnt_start_with: "doesnt_start_with:${1:foo},${2:bar}",
        doesnt_end_with: "doesnt_end_with:${1:foo},${2:bar}",
        lowercase: "lowercase",
        mac_address: "mac_address",
        max_digits: "max_digits:${1:value}",
        min_digits: "min_digits:${1:value}",
        multiple_of: "multiple_of:${1:value}",
        password: "password",
        prohibited: "prohibited",
        prohibited_if: "prohibited_if:${1:anotherfield},${2:value}",
        prohibited_unless: "prohibited_unless:${1:anotherfield},${2:value}",
        required_array_keys: "required_array_keys:${1:foo},${2:bar}",
        uppercase: "uppercase",
      };

    provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext): Array<vscode.CompletionItem> {
        var out:Array<vscode.CompletionItem> = [];
        var func = Helpers.parseDocumentFunction(document, position);

        if (
            (func && func.paramIndex !== null && func.function && Helpers.tags.validation.functions.some((fn:string) => func.function.includes(fn))) ||
            (func && func.paramIndex !== null && func.class && Helpers.tags.validation.classes.some((cls:string) => func.class.includes(cls))) ||
            (document
                .getText()
                .match(/class .* extends (FormRequest|ParentRequest)/g) &&
                document
                  .getText()
                  .match(
                    /use (Illuminate\\Foundation\\Http\\FormRequest|App\\Ship\\Parents\\Requests\\Request as ParentRequest);/g
                  ))
            ) {
            var rules = this.rules;
            Object.assign(rules, vscode.workspace.getConfiguration("LaravelExtraIntellisense.customValidationRules"));
            for (var i in rules) {
                var completeItem = new vscode.CompletionItem(i, vscode.CompletionItemKind.Enum);
                completeItem.range = document.getWordRangeAtPosition(position, Helpers.wordMatchRegex);
                completeItem.insertText = new vscode.SnippetString(this.rules[i]);
                out.push(completeItem);
            }
        }
        return out;
    }
}
