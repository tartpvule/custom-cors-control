**Custom CORS Control** - Advanced user control for CORS

## EXPERIMENTAL

 EXPERIMENTAL! This project is not currently "ready for production". Breaking changes are to be expected. More tests and feedbacks are needed.

## Introduction

This extension aims to provide a user with complete control over the CORS mechanisms.

Misconfiguring the rules **WILL** break the protections offered by the Same-Origin Policy.

Only requests with an `Origin` header and a matching rule are modified at all by this extension.

## Installation

0. Must be using Firefox ESR or development versions where `xpinstall.signatures.required` is `false`

1. Zip all files in this repository as ccc.zip
2. Rename ccc.zip to ccc.xpi
3. Open ccc.xpi in Firefox

Or for testing in a session

1. Go to about:debugging
2. Click on "Load Temporary Add-on"
3. Point it to the directory containing this repository

## Configuration

**Warning** Read first: <https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS>, and <https://developer.mozilla.org/en-US/docs/Web/HTML/CORS_settings_attributes>.

```
{
  "Type1": {
    "Origin1": {
      "Target1": {
        "Path1": {
      	  "ACRH": [""],
      	  "ACAO": "allow",
      	  "ACEH": [""],
      	  "ACAC": false,
      	  "ACAM": ["GET", "POST"],
      	  "ACAH": [""]
      	}
      }
    }
  }
}
```
1. Request Type

	One of the request types as documented at <https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/webRequest/ResourceType>.

	`*` matches everything, but only if no exact matches.

2. Origin

	Evaluated one-by-one against `details.origin` with `String#endsWith`, but `*` matches everything.

3. Target origin

	Evaluated one-by-one against the origin in `details.targetUrl` with `String#endsWith`, but `*` matches everything.

4. Path

	Evaluated one-by-one against the path in `details.targetUrl` with `String#startsWith`, but `*` matches everything.

* `ACRH`

	Array of values allowed to be present in the `Access-Control-Request-Headers` header in preflight request.

	Headers not present in this array will be omitted from subsequent requests.

* `ACAO`

	`"allow"`: Set `Access-Control-Request-Headers: <origin>` in responses.

	`"star"`: Set `Access-Contorl-Request-Headers: *` in responses.

	`"block"`: Cancel all requests.

* `ACEH`

	An array of values allowed to be present in the `Access-Control-Expose-Headers` header in responses.

* `ACAC`

	Set `Access-Control-Allow-Credentials` header in responses to the specified boolean value.

	Omit `Authorization` and `Cookie` headers from actual requests.

* `ACAM`

	Array of allowed request methods. The request is canceled if not matched.

	For preflight requests, this is matched against `Access-Control-Request-Method`.

	For actual requests, this is matched against `details.method`.

* `ACAH`

	Array of values allowed to be present in the `Access-Control-Allow-Headers` header in preflight responses.

## Default Rules

```
{
  "font": {
    "*": {
      "*": {
        "*": {
          "ACAO": "star",
          "ACAC": false,
          "ACAM": ["GET"]
      	}
      }
    }
  }
}
```

## Acknowledgments

* [gorhill](https://github.com/gorhill) for [uBlock Origin](https://github.com/gorhill/ublock) and [uMatrix](https://github.com/gorhill/umatrix)
* [earthlng](https://github.com/earthlng) and [Thorin-Oakenpants](https://github.com/Thorin-Oakenpants) for the [ghacks-user.js](https://github.com/ghacksuserjs/ghacks-user.js) project.
* [crssi](https://github.com/crssi) for opening [the issue](https://github.com/ghacksuserjs/ghacks-user.js/issues/509) on the [ghacks-user.js](https://github.com/ghacksuserjs/ghacks-user.js) project, bringing the Origin header leak to attention.
* [claustromaniac](https://github.com/claustromaniac) for his [Privacy-Oriented Origin Policy](https://github.com/claustromaniac/poop) project, which is the first extension I came across that attempts to close the `Origin` header leak.

## License

The MIT License (MIT)

Copyright (c) 2019 tartpvule

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
