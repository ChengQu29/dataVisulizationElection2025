# Canada Federal Electoral Districts 2025

Interactive visualization of Canada's 352 federal election ridings (based on 2025 redistribution).
Modified from https://observablehq.com/@d3/zoom-to-bounding-box@182

## Features
- **Click any riding** to zoom into its boundaries
- **Hover** to highlight and see riding name and number
- **Click background** to reset view
- **Pan and zoom** with mouse/trackpad
- Shows all 352 federal electoral districts as per 2025 redistribution

View this notebook in your browser by running a web server in this folder. For
example:

~~~sh
npx http-server
~~~

Or, use the [Observable Runtime](https://github.com/observablehq/runtime) to
import this module directly into your application. To npm install:

~~~sh
npm install @observablehq/runtime@5
npm install https://api.observablehq.com/@d3/zoom-to-bounding-box@182.tgz?v=3
~~~

Then, import your notebook and the runtime as:

~~~js
import {Runtime, Inspector} from "@observablehq/runtime";
import define from "@d3/zoom-to-bounding-box";
~~~

To log the value of the cell named “foo”:

~~~js
const runtime = new Runtime();
const main = runtime.module(define);
main.value("foo").then(value => console.log(value));
~~~
