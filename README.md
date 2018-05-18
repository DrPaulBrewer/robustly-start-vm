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

## Writing your diskFunc({zone, region}) 

`diskFunc` is called to create a disk in a particular zone and region to be 
the new VM's boot disk.

Your `diskFunc` should return an object, in the form of a
 [Google Compute Engine[tm] REST representation  of a disk](https://cloud.google.com/compute/docs/reference/rest/v1/disks).  However, not all of the fields are necessary. 

For many applications, it is advisable to create a manual snapshot with everything
needed, and clone this snapshot when demands for new VMs arrive:
1. create a VM manually
2. manually install all necessary software
3. manually create a snapshot of the VM's disk to clone later

For cloning snapshots you can use a `diskFunc` something like this:

```javascript
const jsonTemplate = require('json-templates');
const vmConfigConstants = {
  project: 'my-google-cloud-project-name',
  snapshot: 'my-saved-disk-snapshot-name',
  size: 20 
}
const diskRestTemplate = {
  "sourceSnapshot": "projects/{{project}}/global/snapshots/{{snapshot}}",
  "type": "projects/{{project}}/zones/{{zone}}/diskTypes/pd-standard",
  "sizeGb": {{size}},
  "zone": "projects/{{project}}/zones/{{zone}}"
};
const diskTemplate = jsonTemplate(diskRestTemplate); // returns function
function mergeConfig(location){
  return Object.assign({}, vmConfigConstants, location);
}
function diskFunc(location){
  return diskTemplate(mergeConfig(location));
}
```

## Writing your vmFunc({zone, region})

`vmFunc` is called to create a VM in a particular zone and region.  It will boot
off the *disk* previously created from the specification from `diskFunc`.

`vmFunc` function should return an object in the form of a 
[Google Compute Engine[tm] REST representation of a VM](https://cloud.google.com/compute/docs/reference/rest/v1/instances). As with
`diskFunc`, not all fields are necessary.  A reasonable way to obtain the REST
 template is to use the Google Compute Engine[tm] web UI to create a new VM. On the
 bottom of either the create instance or running instance details pages is a link
"Equivalent REST". Clicking reveals a REST object. You should copy and paste the REST object to a text editor and 
remove fields like "creationTimestamp", "id" and similar, and be on the lookout
for fields that have embedded parameters like
 "projects/my-project/zones/us-central1-c" which you should change.  If your are 
 going to use jsonTemplate, the previous example suggests that 
  "projects/{{project}}/zones/{{zone}}" should be in the template.
  
For VMs, I like to put the REST template in a `.json` file.

Here is such a template for creating a pre-emptible instance that has
a start script, user parameters configured into the VM `metadata` that the VM
can fetch once it is running, and runs with the permissions of a specific service
account. `http` and `https` indicate whether the Google Firewall should allow in
http or https traffic, in this case of a worker VM I have set both to false. Your 
own use case may vary.

```json
{
    "disks": [
	{
	    "autoDelete": true,
	    "boot": true,
	    "deviceName": "{{vmname}}",
	    "licenses": [
		     "projects/debian-cloud/global/licenses/debian-8-jessie"
	    ],
	    "mode": "READ_WRITE",
	    "source": "projects/{{project}}/zones/{{zone}}/disks/{{vmname}}",
	    "type": "PERSISTENT"
	}
    ],
    "http": false,
    "https": false,
    "machineType": "n1-highcpu-{{vmsize}}",
    "metadata": {
	"items": [
	    {
		"key": "startup-script-url",
		"value": "gs://cloud-storage-bucket-for-start-scripts/start.sh"
	    },
	    {
		"key": "soda-flavor",
		"value": "{{usersoda}}"
	    }
	]
    },
    "description": "What you want the description to be in the monitoring web UI",
    "scheduling": {
	     "preemptible": true,
	     "onHostMaintenance": "TERMINATE",
	     "automaticRestart": false
    },
    "networkInterfaces": [
	{
	    "network": "projects/{{project}}/global/networks/default",
	    "subnetwork": "projects/{{project}}/regions/{{region}}/subnetworks/default",
	    "accessConfigs": [
		{
		    "name": "External NAT",
		    "type": "ONE_TO_ONE_NAT"
		}
	    ]
	}
    ],  
    "serviceAccounts": [
	{
	    "email": "some-specific-service-account@blah-blah-blah",
	    "scopes": [
		       "https://www.googleapis.com/auth/cloud-platform"
	    ]
	}
    ]  
}
```

Note that injecting potentially-tainted (malicious) user input data into a template
 is a recipe for disaster.  Always restrict user data to approved
values, perhaps with something like `npm:Joi`.

Given this template, writing `vmFunc` is a matter of merging in the 
additional parameters with the zone and region provided in `vmFunc`, 
as shown earlier in `diskFunc`.

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
