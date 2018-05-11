# robustly-start-vm

Robustly start a VM on Google Compute Cloud given a list of zones, a name, and relevant templating functions. Automatically retry if a zone is full. 

## Installation

    npm i @google-cloud/compute -S
	npm i robustly-start-vm -S

## JS Engine Compatiblity

Includes ES6+ code. Intended for deployment on node.js

## Initialization

	const compute = require('@google-cloud/compute')(); // requires credentials when run outside of Google Cloud 
	const robustlyStartVM = require('robustly-start-vm')(compute,'myworker-');

## Usage

requires object parameter with properties (array of strings) zones, (string) vmname, and (functions) diskFunc, vmFUnc

`vmname` must start with the string set as the `safety` string, such as `myworker-` above, or an error will be thrown.

returns Promise
	
	const promiseVM = robustlyStartVM({zones, vmname, diskFunc, vmFunc})
	
diskFunc and vmFunc have a signature

    diskFunc({zone, region})
	vmFunc({zone, region})
	
and should return an object describing a Google Compute Engine[tm] REST representation of a disk or VM

I find `npm:json-templates` to be a useful function for building diskFunc and vmFunc.

## Known Issues

This code does not clean up when retries are exceeded, so you will sometimes get stuck with an extra Google Compute Engine disk that you do not want.

These cost money over time, so be sure to check `gcloud compute disks list` or the web UI and delete as appropriate or create a cron job to automate deletion.

Remember, **this software is licensed AS IS** and **you are solely responsible for any Google Cloud costs**, including those costs resulting from bugs in software.
	
### Copyright

Copyright 2018 Paul Brewer, Economic and Financial Technology Consulting LLC

### License

The MIT License (MIT)

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

### No relationship to Google, Inc.

This software is 3rd party software. This software is not a product of Google, Inc.

Google Compute Engine[tm] is a trademark of Google, Inc.


