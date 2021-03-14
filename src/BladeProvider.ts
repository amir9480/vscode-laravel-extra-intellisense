'use strict';

import * as vscode from 'vscode';
import Helpers from './helpers';


export default class BladeProvider implements vscode.CompletionItemProvider {
    private customDirectives: Array<any> = [];

    constructor () {
        var self = this;
        self.loadCustomDirectives();
        setInterval(() => self.loadCustomDirectives(), 600000);
    }

    provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext): Array<vscode.CompletionItem> {
        let isBlade = document.languageId == 'blade' || document.languageId == 'laravel-blade' || document.fileName.endsWith('.blade.php');
        if (vscode.workspace.getConfiguration("LaravelExtraIntellisense").get<boolean>('disableBlade', false) || isBlade === false) {
            return [];
        }
        var out:Array<vscode.CompletionItem> = this.getDefaultDirectives(document, position);

        for (var i in this.customDirectives) {
            var completeItem = new vscode.CompletionItem('@' + this.customDirectives[i].name + (this.customDirectives[i].hasParams ? '(...)' : ''), vscode.CompletionItemKind.Keyword);
            completeItem.insertText = new vscode.SnippetString('@' + this.customDirectives[i].name + (this.customDirectives[i].hasParams ? '(${1})' : ''));
            completeItem.range = document.getWordRangeAtPosition(position, Helpers.wordMatchRegex);
            out.push(completeItem);
        }
        return out;
    }

    loadCustomDirectives() {
        try {
            var self = this;
            //
            Helpers.runLaravel(
                "$out = [];" +
                "foreach (app(Illuminate\\View\\Compilers\\BladeCompiler::class)->getCustomDirectives() as $name => $customDirective) {" +
                "    if ($customDirective instanceof \\Closure) {" +
                "        $out[] = ['name' => $name, 'hasParams' => (new ReflectionFunction($customDirective))->getNumberOfParameters() >= 1];" +
                "    } elseif (is_array($customDirective)) {" +
                "        $out[] = ['name' => $name, 'hasParams' => (new ReflectionMethod($customDirective[0], $customDirective[1]))->getNumberOfParameters() >= 1];" +
                "    }" +
                "}" +
                "echo json_encode($out);"
                )
                .then(function (result) {
                    var customDirectives = JSON.parse(result);
                    self.customDirectives = customDirectives;
                });
        } catch (exception) {
            console.error(exception);
        }
    }

    getDefaultDirectives(document: vscode.TextDocument, position: vscode.Position): Array<vscode.CompletionItem> {
        var snippets : any = {
            '@if(...)': new vscode.SnippetString('@if (${1})\n' + Helpers.getSpacer() + '${2}\n' + '@endif'),
            '@error(...)': new vscode.SnippetString('@error(${1})\n' + Helpers.getSpacer() + '${2}\n' + '@enderror'),
            '@if(...) ... @else ... @endif': new vscode.SnippetString('@if (${1})\n' + Helpers.getSpacer() + '${2}\n' + '@else\n' + Helpers.getSpacer() + '${3}\n' + '@endif'),
            '@foreach(...)': new vscode.SnippetString('@foreach (${1} as ${2})\n' + Helpers.getSpacer() + '${3}\n' + '@endforeach'),
            '@forelse(...)': new vscode.SnippetString('@forelse (${1} as ${2})\n' + Helpers.getSpacer() + '${3}\n' + '@empty\n' + Helpers.getSpacer() + '${4}\n' + '@endforelse'),
            '@for(...)': new vscode.SnippetString('@for (${1})\n' + Helpers.getSpacer() + '${2}\n' + '@endfor'),
            '@while(...)': new vscode.SnippetString('@while (${1})\n' + Helpers.getSpacer() + '${2}\n' + '@endwhile'),
            '@switch(...)': new vscode.SnippetString('@switch(${1})\n' + Helpers.getSpacer() + '@case(${2})\n' + Helpers.getSpacer().repeat(2) + '${3}\n' + Helpers.getSpacer().repeat(2) + '@break\n\n' + Helpers.getSpacer() + '@default\n' + Helpers.getSpacer().repeat(2) + '${4}\n@endswitch'),
            '@case(...)': new vscode.SnippetString('@case(${1})\n' + Helpers.getSpacer() + '${2}\n@break'),
            '@break': new vscode.SnippetString('@break'),
            '@continue': new vscode.SnippetString('@continue'),
            '@break(...)': new vscode.SnippetString('@break(${1})'),
            '@continue(...)': new vscode.SnippetString('@continue(${1})'),
            '@default': new vscode.SnippetString('@default'),
            '@extends(...)': new vscode.SnippetString('@extends(${1})'),
            '@empty': new vscode.SnippetString('@empty'),
            '@verbatim ...': new vscode.SnippetString('@verbatim\n' + Helpers.getSpacer() + '${2}\n' + '@endverbatim'),
            '@json(...)': new vscode.SnippetString('@json(${1})'),
            '@elseif (...)': new vscode.SnippetString('@elseif (${1})'),
            '@else': new vscode.SnippetString('@else'),
            '@unless(...)': new vscode.SnippetString('@unless (${1})\n' + Helpers.getSpacer() + '${2}\n' + '@endunless'),
            '@isset(...)': new vscode.SnippetString('@isset(${1})\n' + Helpers.getSpacer() + '${2}\n' + '@endisset'),
            '@empty(...)': new vscode.SnippetString('@empty(${1})\n' + Helpers.getSpacer() + '${2}\n' + '@endempty'),
            '@auth': new vscode.SnippetString('@auth\n' + Helpers.getSpacer() + '${1}\n' + '@endauth'),
            '@guest': new vscode.SnippetString('@guest\n' + Helpers.getSpacer() + '${1}\n' + '@endguest'),
            '@auth(...)': new vscode.SnippetString('@auth(${1})\n' + Helpers.getSpacer() + '${2}\n' + '@endauth'),
            '@guest(...)': new vscode.SnippetString('@guest(${1})\n' + Helpers.getSpacer() + '${2}\n' + '@endguest'),
            '@can(...)': new vscode.SnippetString('@can(${1})\n' + Helpers.getSpacer() + '${2}\n' + '@endcan'),
            '@cannot(...)': new vscode.SnippetString('@cannot(${1})\n' + Helpers.getSpacer() + '${2}\n' + '@endcannot'),
            '@elsecan(...)': new vscode.SnippetString('@elsecan(${1})'),
            '@elsecannot(...)': new vscode.SnippetString('@elsecannot(${1})'),
            '@production': new vscode.SnippetString('@production\n' + Helpers.getSpacer() + '${1}\n' + '@endproduction'),
            '@env(...)': new vscode.SnippetString('@env(${1})\n' + Helpers.getSpacer() + '${2}\n' + '@endenv'),
            '@hasSection(...)': new vscode.SnippetString('@hasSection(${1})\n' + Helpers.getSpacer() + '${2}\n' + '@endif'),
            '@sectionMissing(...)': new vscode.SnippetString('@sectionMissing(${1})\n' + Helpers.getSpacer() + '${2}\n' + '@endif'),
            '@include(...)': new vscode.SnippetString('@include(${1})'),
            '@includeIf(...)': new vscode.SnippetString('@includeIf(${1})'),
            '@includeWhen(...)': new vscode.SnippetString('@includeWhen(${1}, ${2})'),
            '@includeUnless(...)': new vscode.SnippetString('@includeUnless(${1}, ${2})'),
            '@includeFirst(...)': new vscode.SnippetString('@includeFirst(${1})'),
            '@each(...)': new vscode.SnippetString('@each(${1}, ${2}, ${3})'),
            '@once': new vscode.SnippetString('@production\n' + Helpers.getSpacer() + '${1}\n' + '@endonce'),
            '@yield(...)': new vscode.SnippetString('@yield(${1})'),
            '@slot(...)': new vscode.SnippetString('@slot(${1})'),
            '@stack(...)': new vscode.SnippetString('@method(${1})'),
            '@push(...)': new vscode.SnippetString('@push(${1})\n' + Helpers.getSpacer() + '${2}\n' + '@endpush'),
            '@prepend(...)': new vscode.SnippetString('@prepend(${1})\n' + Helpers.getSpacer() + '${2}\n' + '@endprepend'),
            '@php': new vscode.SnippetString('@php\n' + Helpers.getSpacer() + '${1}\n' + '@endphp'),
            '@component(...)': new vscode.SnippetString('@component(${1})\n' + Helpers.getSpacer() + '${2}\n' + '@endcomponent'),
            '@section(...) ... @endsection': new vscode.SnippetString('@section(${1})\n' + Helpers.getSpacer() + '${2}\n' + '@endsection'),
            '@section(...)': new vscode.SnippetString('@section(${1})'),
            '@props(...)': new vscode.SnippetString('@props(${1})'),
            '@show': new vscode.SnippetString('@show'),
            '@stop': new vscode.SnippetString('@stop'),
            '@parent': new vscode.SnippetString('@parent'),
            '@csrf': new vscode.SnippetString('@csrf'),
            '@method(...)': new vscode.SnippetString('@method(${1})'),
            '@inject(...)': new vscode.SnippetString('@inject(${1}, ${2})'),
            '@dump(...)': new vscode.SnippetString('@dump(${1})'),
            '@dd(...)': new vscode.SnippetString('@dd(${1})'),
            '@lang(...)': new vscode.SnippetString('@lang(${1})'),

            '@endif': new vscode.SnippetString('@endif'),
            '@enderror': new vscode.SnippetString('@enderror'),
            '@endforeach': new vscode.SnippetString('@endforeach'),
            '@endforelse': new vscode.SnippetString('@endforelse'),
            '@endfor': new vscode.SnippetString('@endfor'),
            '@endwhile': new vscode.SnippetString('@endwhile'),
            '@endswitch': new vscode.SnippetString('@endswitch'),
            '@endverbatim': new vscode.SnippetString('@endverbatim'),
            '@endunless': new vscode.SnippetString('@endunless'),
            '@endisset': new vscode.SnippetString('@endisset'),
            '@endempty': new vscode.SnippetString('@endempty'),
            '@endauth': new vscode.SnippetString('@endauth'),
            '@endguest': new vscode.SnippetString('@endguest'),
            '@endproduction': new vscode.SnippetString('@endproduction'),
            '@endenv': new vscode.SnippetString('@endenv'),
            '@endonce': new vscode.SnippetString('@endonce'),
            '@endpush': new vscode.SnippetString('@endpush'),
            '@endprepend': new vscode.SnippetString('@endprepend'),
            '@endphp': new vscode.SnippetString('@endphp'),
            '@endcomponent': new vscode.SnippetString('@endcomponent'),
            '@endsection': new vscode.SnippetString('@endsection'),
            '@endslot': new vscode.SnippetString('@endslot'),
            '@endcan': new vscode.SnippetString('@endcan'),
            '@endcannot': new vscode.SnippetString('@endcannot'),
        };

        var out:Array<vscode.CompletionItem> = [];
        for (let snippet in snippets) {
            var completeItem = new vscode.CompletionItem(snippet, vscode.CompletionItemKind.Keyword);
            if (snippets[snippet] instanceof vscode.SnippetString) {
                completeItem.insertText = snippets[snippet];
            }
            completeItem.range = document.getWordRangeAtPosition(position, Helpers.wordMatchRegex);
            out.push(completeItem);
        }
        return out;
    }
}
