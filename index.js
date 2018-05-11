// robustly-start-vm Copyright 2018 Paul Brewer, Economic and Financial Technology Consulting LLC
// This software is open source software available under the terms of the MIT License
// https://opensource.org/licenses/MIT
// This software is NOT a product of Google, Inc.

// jshint node:true, esversion:6 

/**
 * returns the robustlyStartVM function.  new VMs must have names starting with the configured safety string.
 * @param {Object} gce result from calling `const gce = require('@google-cloud/compute')()
 * @param {string} safety (required) sets the safety string.  Creating a VM with a name that does not start with the safety string is forbidden. 
 * @param {number} timeout (optional, default 30000) delay in ms to retry creating a vm that failed to start
 * @return {Function} robustlyStartVM
 */

const promiseRetry = require('promise-retry');
const after = require('after-operation');
const Boom = require('boom');

module.exports = function(gce, safety, timeout){
    if (typeof(safety)!=="string") throw new Error("safety must be a string");
    if (safety.length===0) throw new Error("safety string must not be length 0");
    return function robustlyStartVM({zones,vmname,diskFunc,vmFunc}){
	if (!safety || !(vmname.startsWith(safety))) throw new Error("bad vmname ${vmname}");
	if (!Array.isArray(zones)) throw new Error("bad or missing array zones");
	if (typeof(vmname)!=="string") throw new Error("bad or missing string vmname");
	if (typeof(diskFunc)!=="function") throw new Error("bad or missing function diskFunc");
	if (typeof(vmFunc)!=="function") throw new Error("bad or missing function vmFunc");
	function locationForAttempt(n){
	    return {'zone':zones[n-1], 'region': zonesForGoogleCloud.toRegion(zones[n-1])};
	}
	function diskForAttempt(n){
	    return diskFunc(locationForAttempt(n));
	}
	function vmForAttempt(n){
	    return vmFunc(locationForAttempt(n));
	}
	function deleteOldDisk(n){
	    const gzone = gce.zone(locationForAttempt(n-1).zone);
	    return (
		gzone
		    .disk(vmname)
		    .delete()
		    .catch(ee=>console.log(`Cleanup error on disk deletion ${vmname}: ${ee}. `))
			);
	}
	function attemptStartVM(retry, attemptNumber){
	    if (attemptNumber===0) throw new Error("promise-rety attemptNumber should never be zero, but it is zero");
	    if ((attemptNumber>3) || (attemptNumber>zones.length))
		throw new Error("VM creation failed. Too busy. Please try again later.");
	    const gzone = gce.zone(locationForAttempt(attemptNumber).zone);
	    const prep  = (attemptNumber<=1)? Promise.resolve(0): deleteOldDisk(attemptNumber);
	    return (prep
		    .then(()=>(gzone.createDisk(vmname, diskForAttempt(attemptNumber))))
		    .then((data) => {
			const disk = data[0];
			const operation = data[1];
			const apiResponse = data[2];
			return after(operation, disk);
		    })
		    .then((disk) => {
			return (gzone
				.createVM(vmname, vmForAttempt(attemptNumber))
				.then((data) => {
				    const vm = data[0];
				    const operation = data[1];
				    const apiResponse = data[2];
				    return after(operation, locationForAttempt(attemptNumber) );
				})
			       );
		    })
		    .catch((e) => {
			if (e.toString().includes("already exists")){
			    throw Boom.conflict(e.toString());
			}
			if (e.toString().toLowerCase().includes("try a different zone")){
			    retry(e);
			}
			throw e;
		    })
			);
	}
	return promiseRetry(attemptStartVM, {retries: zones.length-1, minTimeout: (timeout || 30000), factor: 1.5 });
    }                                                    
};

