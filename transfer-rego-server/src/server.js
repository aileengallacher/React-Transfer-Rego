const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const storage = require('node-persist');
const { request, response } = require('express');
// let customers = require('./customers.json');  // no longer needed once storage initialised
// let registrations = require('./registrations.json');  // no longer needed once storage initialised

(async () => {
    await storage.init({ dir: './data' });

    // ---------------------------------------------------------------------
    // Once storage has been initiated this is no longer needed - delete it!
    // ---------------------------------------------------------------------
    // for (let c of customers){
    //     let customerNumber = uuidv4();
    //     let customer = {id:customerNumber,...c};  // giving it an id and adding to existing 
    //     let customerStorageKey = `cn-${customerNumber}`;
    //     await storage.setItem(customerStorageKey, customer);
    // }
    //     for (let r of registrations){
    //     let regoId = uuidv4();
    //     let registration = {id:regoId,...r};  // giving it an id and adding to existing 
    //     let regoStorageKey = `rego-${regoId}`;
    //     await storage.setItem(regoStorageKey, registration);
    // }

    const server = express();
    server.use(cors());
    server.use(express.json());
    server.use(bodyParser.json());

    // GET handler to get the customers array
    server.get('/customers', async (request, response) => {
        let customers = await storage.valuesWithKeyMatch(/cn-/);   // only getting keys starting with cn-
        response.json(customers)
    });

    // GET handler to get the registrations array
    server.get('/registrations', async (request, response) => {
        let registrations = await storage.valuesWithKeyMatch(/rego-/);   // only getting keys starting with cn-
        response.json(registrations)
    });

    // POST handler for storing new rego obj  ****** NEED TO TEST THIS
    server.post('/registrations/new', async (request, response) => {
        let data = request.body;
        let registrationNumber = request.body.registrationNumber;
        let registrationUsage = request.body.registrationUsage;
        let acquisitionDate = request.body.acquisitionDate;
        let ownerId = request.body.ownerId;
        let registration = {
            id: uuidv4(),
            ...data,
            disposalDate: '',
            transactionDate: new Date().toISOString().slice(0, 10)
        }

        await storage.setItem(`rego-${registration.id}`, registration);
        response.json({ status: 200, msg: "Registration details have been added" });

    });

    // GET handler to retrieve customer/s by ownerID (URL/customers/{key})  ***ADD TO SEARCH.JS SHOULD NOW BE COVERED BY SEARCH PREDICATE
    server.get('/find-by-owner/:ownerId', async (request, response) => {
        let ownerId = request.params.ownerId;
        let findRegoByOwnerId = await storage.data();
        let regoFound = findRegoByOwnerId.filter(r => r.value.ownerId === ownerId);
        if (regoFound == undefined) {
            response.json({ status: 400, message: "No registration found for owner ID provided" });
        } else {
            response.json(regoFound);
        }
    });

    // GET handler to retrieve registration by rego-id (URL/registrations/{key}) ** SHOULD NOW BE COVERED BY PREDICATE
    server.get('/registrations/:id', async (request, response) => {
        let registration = await storage.getItem(`rego-${request.params.id}`);
        if (registration == undefined) {
            response.json({ status: 400, message: "No registration found for ID provided" });
        } else {
            response.json(registration);
        }
    });

    // GET handler to search registration records based on predicate value
    server.get('/search/:predicate/:term', async (request, response) => {
        let registrations = await storage.valuesWithKeyMatch(/rego-/);
        // let registrations = await storage.data();
        let result;
        switch (request.params.predicate) {
            case "number":
                // result = registrations;
                result = registrations.find(r => r.registrationNumber === request.params.term);
                break;
            case "id":
                result = registrations.find(r => r.id === request.params.term);
                break;
            case "owner":
                result = registrations.filter(r => r.ownerId === request.params.term);
                break;
            case "usage":
                result = registrations.filter(r => r.registrationUsage === request.params.term);
                break;
            default:
                result = [];
        }
        response.json(result);
    });

    // GET handler to retrieve registration by usage (URL//{key})find-usage/{key}  ** add to SEARCH.JS Predicate
    server.get('/find-usage/:registrationUsage', async (request, response) => {
        let registrationUsage = request.params.registrationUsage;
        let findRegoByUsage = await storage.data();
        let regoFound = findRegoByUsage.find(r => r.value.registrationUsage === registrationUsage)
        if (regoFound == undefined) {
            response.json({ status: 400, message: "No results found for usage type provided" });
        } else {
            response.json(regoFound);
        }
    });

    // PUT handler to update details this is working but make it into the predicate example

    server.put('/registrations/update', async (request, response) => {
        try {
            let registrationId = request.body.registrationId;

            let foundRegistration = await storage.getItem(`rego-${registrationId}`);
            // let key = `rego-${registrationId}`;
            foundRegistration.registrationId = registrationId;
            foundRegistration.acquisitionDate = request.body.acquisitionDate;
            foundRegistration.disposalDate = request.body.disposalDate;
            if (request.body.registrationUsage !== "") {
                foundRegistration.registrationUsage = request.body.registrationUsage;
            }
            foundRegistration.ownerId = request.body.ownerId;
            await storage.updateItem(`rego-${registrationId}`, foundRegistration);
            response.json({ data: foundRegistration, status: 200 });
        } catch (error) {
            response.json({ status: 500, message: error.message })

        }

    });


    // server.put('/registrations/update/:id', async (request, response) => {
    //     let registrations = await storage.valuesWithKeyMatch(/rego-/);
    //     let registration = registrations.filter(r => {
    //         return r.id === request.params.id;
    //     })[0];
    //     // find the index of the registration found within the array
    //     let index = registrations.indexOf(registration);
    //     //brings back all the keys that come in on the request.body
    //     let keys = Object.keys(request.body);
    //     // loops through all the keys, sets the value of found obj key to the value of request.body key 
    //     keys.forEach(key => {
    //         registration[key] = request.body[key];
    //     });

    //     // update array details
    //     registrations[index] = registration;
    //     response.json(registrations[index]);
    // });

    // DELETE handler to delete a record by registration ID
    server.delete('/registrations/delete', async (request, response) => {
        let registrations = await storage.valuesWithKeyMatch(/rego-/);
        let registration = registrations.filter(r => {
            return r.id === request.params.id;
        })[0];
        // find the index of the registration found within the array
        let index = registrations.indexOf(registration);
        registrations.splice(index, 1);
        response.json({ message: `Registration ID ${request.params.id} has been deleted.` })
    });

    server.listen(4000, () => {
        console.log(`The server has started listening on: http://localhost:4000`);
    })

})();
