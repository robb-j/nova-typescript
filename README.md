# nova-typescript

[apexskier/nova-typescript](https://github.com/apexskier/nova-typescript) is no longer in active maintenance, I thought I'd see how hard it would be to make my own version of it.

This doesn't have all the features, but it does have the ones I think I'd use to work with TypeScript in Nova.
I tried to simplify it to a "core" and modernise bits that were using older APIs or where APIs have become available.
There is no guarantee I'll work on this any more, publish or support it.

[Official TypeScript LSP issue](https://github.com/microsoft/TypeScript/issues/39459)

**experimental ts-go**

I wanted to have a try with the new go-based TypeScript lsp, the only "documentation" I found was the open-source vs-code client which calls the tsgo binary with `--lsp`, [code](https://github.com/microsoft/typescript-go/blob/f6f7e665c9960411b19391d6c0ba7ac37e65c195/_extension/src/client.ts#L101).
To try it, clone this repo, open it in nova, run the build and turn on "ts go" in the extension settings.
