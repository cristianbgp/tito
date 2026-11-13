# Third-party notices

Tito's MIT license covers its original code. Dependencies and third-party material retain their own licenses and rights. Package licenses are distributed with installed dependencies; this file records bundled source/data that needs an explicit notice.

## OpenDota dotaconstants and replay parser

The normalized hero snapshots in `apps/api/src/draft/heroes.snapshot.json` and `apps/web/public/reference-catalog.json`, and the item snapshot in `apps/api/src/replays/items.snapshot.json`, derive from [OpenDota dotaconstants](https://github.com/odota/dotaconstants). Snapshot retrieval metadata is included in the files. Replay builds bundle [OpenDota's parser](https://github.com/odota/parser) at commit `67945be040de92d0ba9cdedc77434886d4f736be`; its license is also copied alongside the built JAR. These projects use the following MIT license:

```text
MIT License

Copyright (c) 2017 The OpenDota Project

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## shadcn/ui

The adapted component source in `apps/web/src/components/ui` and related utilities builds on [shadcn/ui](https://github.com/shadcn-ui/ui). Its upstream [MIT license](https://github.com/shadcn-ui/ui/blob/main/LICENSE.md) follows:

```text
MIT License

Copyright (c) 2023 shadcn

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## better-auth-steam patch

`patches/better-auth-steam@0.2.3.patch` modifies the installed `better-auth-steam` package for Tito's Better Auth compatibility. The original package's license is preserved below; the dependency itself is installed through Bun, not copied into this repository.

```text
MIT License

Copyright (c) 2026

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Valve content and external services

Dota 2, Steam, hero/item names and associated game artwork belong to Valve Corporation or their respective rights holders. Tito uses external image URLs and public game metadata; its MIT license does not relicense Valve artwork or trademarks. Tito is independent and is not affiliated with or endorsed by Valve, OpenDota, or the providers it connects to.

Calls to external APIs remain subject to each provider's terms. No provider credentials or rights to third-party services are included with this repository.
