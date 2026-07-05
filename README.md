# DevKit Studio

A browser-based flagship developer toolkit that combines JSON tools,
XML tools, RSS parsing, API testing, response comparison, schema
generation, API viewing, request history, collections, environments,
and mock response generation in one workspace.

## Live Links

- GitHub Repository: [fazal305/devkit-studio](https://github.com/fazal305/devkit-studio)
- Live Demo: [https://fazal305.github.io/devkit-studio/](https://fazal305.github.io/devkit-studio/)

## Overview

DevKit Studio is a multi-page browser-based developer platform built for local-first API and data workflows. It brings together common developer utilities into one polished workspace with shared navigation, shared styling, localStorage persistence, and dedicated module pages.

The project is designed as a flagship portfolio application: it demonstrates structured frontend architecture, recursive data processing, API workflows, export/download flows, and professional UI composition without build tools or frontend frameworks.

## Modules

- Dashboard
- JSON Explorer
- XML Explorer
- RSS Reader
- API Client
- Response Comparator
- Schema Builder
- JSON ↔ XML Converter
- API Viewer
- Request History
- Collections
- Environment Variables
- Mock Response Generator

## Features

- Multi-page browser application architecture
- Shared cyberpunk developer workspace UI
- Sticky responsive sidebar navigation
- JSON validation, formatting, minifying, and tree rendering
- XML validation, formatting, and tree rendering
- RSS feed parsing, searching, and JSON export
- API request sending with methods, headers, query parameters, and JSON bodies
- API response status, timing, size, and content-type stats
- Request history persisted in localStorage
- Request collections persisted in localStorage
- Environment variables with `{{variable}}` replacement support
- Recursive JSON response comparison
- Recursive JSON Schema generation
- JSON to XML and XML to JSON conversion
- OpenAPI-style endpoint viewer and documentation export
- Mock JSON response templates
- Copy-to-clipboard actions
- Download/export actions through Blob URLs
- No build tools or framework setup required

## Technologies Used

- HTML5
- CSS3
- Bootstrap 5
- jQuery
- Vanilla JavaScript
- Fetch API
- DOMParser
- XMLSerializer
- JSON.parse
- JSON.stringify
- LocalStorage
- Blob API
- Clipboard API

## Learning Outcomes

- Building a polished multi-page browser application without frameworks
- Creating reusable shared JavaScript utilities
- Designing consistent navigation and layout across separate HTML pages
- Managing state across pages with localStorage
- Parsing and rendering JSON, XML, RSS, and OpenAPI-style data
- Implementing recursive tree rendering, schema generation, and diffing
- Building browser-based API testing workflows
- Creating copy and download workflows using modern browser APIs
- Structuring a portfolio-grade frontend project

## Architecture Notes

DevKit Studio uses a multi-page frontend structure. The dashboard lives in `index.html`, while each tool has its own dedicated HTML file and JavaScript file. This keeps each module isolated while still making the product feel unified through shared navigation, shared CSS, and shared helper functions.

Common utility functions live in `js/shared.js`. Page-specific behavior lives in files such as `js/json-explorer.js`, `js/api-client.js`, and `js/schema-builder.js`. This avoids a giant single script file and makes each module easier to understand and extend.

Persistent data such as request history, collections, and environments is stored in localStorage. The API Client can save requests into history and collections, while Request History and Collections can load saved requests back into the API Client through a shared request draft key.

Recursive logic is used for JSON tree rendering, XML tree rendering, response comparison, JSON Schema generation, and JSON/XML conversion. Export workflows use Blob objects and `URL.createObjectURL()` to download generated files directly from the browser.

The project runs with a no-build architecture. Bootstrap and jQuery are loaded through CDN links, and every page can run locally by opening `index.html` in a browser.

## Folder Structure

```text
devkit-studio/
  index.html
  json-explorer.html
  xml-explorer.html
  rss-reader.html
  api-client.html
  response-comparator.html
  schema-builder.html
  json-xml-converter.html
  api-viewer.html
  request-history.html
  collections.html
  environment-variables.html
  mock-response-generator.html

  styles.css

  js/
    shared.js
    json-explorer.js
    xml-explorer.js
    rss-reader.js
    api-client.js
    response-comparator.js
    schema-builder.js
    json-xml-converter.js
    api-viewer.js
    request-history.js
    collections.js
    environment-variables.js
    mock-response-generator.js

  README.md
  LICENSE
  .gitignore
```
How To Run Locally
git clone https://github.com/fazal305/devkit-studio.git
cd devkit-studio
start index.html
You can also open index.html directly in any modern browser.
How To Use
Open index.html.
Choose a module from the dashboard or sidebar.
Load sample data or paste your own data.
Run the module action, such as validate, parse, compare, generate, convert, or send.
Review the preview, tree, response, report, schema, or generated output.
Use copy or download buttons to export results.
Use API Client with Request History, Collections, and Environment Variables for saved API workflows.
Sample Workflows
Validate JSON
Open JSON Explorer, load sample JSON, validate it, pretty print it, inspect the tree, then download the formatted JSON.

Parse RSS
Open RSS Reader, load the sample RSS feed, parse it, search feed items, then export the feed summary JSON.

Send API request
Open API Client, load the sample request, send it, inspect response stats, and switch between pretty and raw views.

Compare responses
Open Response Comparator, load the sample comparison, review added, removed, changed, and unchanged fields, then export the diff report.

Generate schema
Open Schema Builder, load sample JSON, generate a schema, review field analysis, and download the schema.

Convert JSON to XML
Open JSON ↔ XML Converter, choose JSON to XML, load a sample, convert it, then copy the XML output.

View API endpoints
Open API Viewer, load the sample OpenAPI-style spec, search endpoints, view endpoint details, and download markdown docs.

Save request to collection
Open Collections and create a collection. Open API Client, save a request, return to Collections, and load the saved request later.

Use environment variable
Open Environment Variables, create Development with baseUrl, then use {{baseUrl}}/posts in the API Client.

Generate mock response
Open Mock Response Generator, choose a response type, generate mock JSON, edit it, then download the result.