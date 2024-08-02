const express = require('express');
const appService = require('./appService');

const router = express.Router();

// ----------------------------------------------------------
// API endpoints
// Modify or extend these routes based on your project's needs.

router.get('/check-db-connection', async (req, res) => {
    const isConnect = await appService.testOracleConnection();
    if (isConnect) {
        res.send('connected');
    } else {
        res.send('unable to connect');
    }
});

/* 
API test endpoint
*/
router.get('/test', async (req, res) => {
    res.send("Hello world!");
});



/*================================================
=================RECIPE ENDPOINTS=================
================================================*/
/*
API endpoint to GET recipe and attached images
Example of usage:
...await fetch('/api/recipes?img=<anything>');
    Fetches recipes with images 

...await fetch('/api/recipes?img=<anything>&captionless=1');
    Fetches recipes with images but no captions

...await fetch('/api/recipes?columns=r.Username,r.Cuisine&img=<anything>');
    Fetches recipes but with only username, cuisine attributes and with images

...await fetch('/api/recipes?columns=r.Username,r.Cuisine&img=<anything>');
    Fetches recipes but with only recipeID, username, cuisine attributes and with images

...await fetch('/api/recipes?columns=r.RecipeLevels&filter=Greek,img=<anything>');
    Fetches recipes but with only recipeID, username, cuisine attributes and with images, filtering for Greek cuisine

...await fetch('/api/recipes?id=3');
    Fetches recipe with id 3, no images

TODO: figure out how to apply more than just the cuisine filter
*/
router.get('/recipes', async (req, res) => {
    const columns = req.query.columns ? req.query.columns.split(',') : null;
    const filter = req.query.filter || null;
    const id = req.query.id || null;
    const img = req.query.img;
    const captionless = req.query.captionless;
    const recipes = await appService.fetchRecipes(columns, filter, id, img, captionless);
    if (recipes.length === 0) {
        res.status(404).json({ error: 'No recipes found' });
    } else {
        res.json({ data: recipes });
    }
});

/*
API endpoint to GET a single recipe by ID
*/
router.get('/recipe/:id', async (req, res) => {
    const RecipeID = req.params.id;
    const recipe = await appService.fetchRecipeByID(RecipeID);
    if (recipe.length === 0) {
        res.status(404).json({ error: 'Recipe not found' });
    } else {
        res.json({ data: recipe });
    }
});

/*
API endpoint to GET all liked recipes
*/
router.get('/recipes/liked', async (req, res) => {
    const recipes = await appService.fetchLikedRecipes();
    if (recipes.length === 0) {
        res.status(404).json({ error: 'No liked recipes found' });
    } else {
        res.json({ data: recipes });
    }
});

/*
API endpoint to GET liked recipes liked by user
*/
router.get('/recipes/liked/:id', async (req, res) => {
    const UserID = req.params.id;
    const recipes = await appService.fetchUserLikedRecipes(UserID);
    if (recipes.length === 0) {
        res.status(404).json({ error: 'No liked recipes found' });
    } else {
        res.json({ data: recipes });
    }
});

/*
API endpoint to CREATE a new recipe
Pass in a dictionary containing necessary inputs
e.g. {  'RecipeName': 'Pasta Verde', 
        'Cuisine': 'Italian', 
        'CookingTime': '00 00:30:00',
        'UserID': 3}

Be sure to retrieve RecipeID in response, use that to call steps endpoint
*/
router.post('/recipe', async (req, res) => {
    const recipe = req.body;
    const response = await appService.createRecipe(recipe);
    if (response) {
        res.status(201).json({ message: 'Recipe created', response });
    } else {
        res.status(500).json({ error: 'Failed to create recipe' });
    }
});

/*
API endpoint to DELETE a recipe
*/
router.delete('/recipe/:id', async (req, res) => {
    const recipeID = req.params.id;
    const rowsAffected = await appService.deleteRecipe(recipeID);
    if (rowsAffected > 0) {
        res.json({ message: 'Recipe deleted' });
    } else {
        res.status(404).json({ error: 'Recipe not found or not deleted' });
    }
});

/*
API endpoint to GET steps for a specific recipe by ID
*/
router.get('/recipe/:id/steps', async (req, res) => {
    const RecipeID = req.params.id;
    const steps = await appService.fetchRecipeSteps(RecipeID);
    if (steps.length === 0) {
        res.status(404).json({ error: 'No steps found for this recipe' });
    } else {
        res.json({ data: steps });
    }
});

/*================================================
==================IMAGE ENDPOINTS=================
================================================*/
/*
API endpoint to GET all images and captions associated with RecipeID
*/
router.get('/images/:id', async (req, res) => {
    const captionless = req.query.captionless == 1;
    const RecipeID = req.params.id;
    const images = await appService.fetchImagesByID(RecipeID, captionless);
    if (images.length === 0) {
        res.status(404).json({ error: 'Images not found' });
    } else {
        res.json({ data: images });
    }
});


/*================================================
==================STEP ENDPOINTS==================
================================================*/
/*
API endpoint to insert steps associated with recipe

Note that this should never be run by itself. First, create a new recipe,
retrieve the RecipeID returned in the response, then call this endpoint
with the appropriate RecipeID.

At some point, should probably just fold this into the create recipe endpoint
as you can't have a recipe without steps, and vice versa...

steps value should be a list of strings corresponding to instructions
e.g., ['Preheat the oven to 350F', ...]
*/
router.post('/steps/:id', async (req, res) => {
    const recipeID = req.params.id;
    const steps = req.body.steps;
    let success = true; 

    for (let i = 0; i < steps.length; i++) {
        const response = await appService.insertStep(i + 1, steps[i], recipeID);
        console.log(response);
        if (!response) {
            success = false;
            break;
        }
    }

    if (success) {
        res.status(201).json({ message: 'Steps inserted successfully' });
    } else {
        res.status(500).json({ error: 'Failed to insert all steps' });
    }
});






/*================================================
==================USER ENDPOINTS==================
================================================*/
/*
API endpoint to GET a user's UserID, Name, Points, and Rank
*/
router.get('/user/:id', async (req, res) => {
    const columns = req.query.columns ? req.query.columns.split(',') : null;
    const UserID = req.params.id;
    const tableContent = await appService.fetchUser(UserID, columns);
    res.json({data: tableContent});
});

/* 
API endpoint to GET all users' UserID, Name, Points, and Rank
*/
router.get('/users', async (req, res) => {
    const columns = req.query.columns ? req.query.columns.split(',') : null;
    const tableContent = await appService.fetchAllUsers(columns);
    res.json({data: tableContent});
});

/*
API endpoint to CREATE a new user
Pass in a dictionary containing the name
e.g. {  'Username': 'Ford Prefect' }
*/
router.post('/user', async (req, res) => {
    const Username = req.body.UserName;
    const response = await appService.createUser(Username);
    if (response) {
        res.status(201).json({ message: 'User created', response });
    } else {
        res.status(500).json({ error: 'Failed to create new user' });
    }
});










/*
API endpoint to GET a user's pantries
*/
router.get('/pantry/:id', async (req, res) => {
    const UserID = req.params.id;
    const tableContent = await appService.fetchPantries(UserID);
    res.json({data: tableContent});
});





/*
API endpoint to UPDATE an existing recipe
*/
router.put('/recipe/:id', async (req, res) => {
    const RecipeID = req.params.id;
    const recipe = { ...req.body, RecipeID: RecipeID };
    const rowsAffected = await appService.updateRecipe(recipe);
    if (rowsAffected > 0) {
        res.json({ message: 'Recipe updated' });
    } else {
        res.status(404).json({ error: 'Recipe not found or not updated' });
    }
});

/*
API endpoint to DELETE a recipe
*/
router.delete('/recipe/:id', async (req, res) => {
    const RecipeID = req.params.id;
    const rowsAffected = await appService.deleteRecipe(RecipeID);
    if (rowsAffected > 0) {
        res.json({ message: 'Recipe deleted' });
    } else {
        res.status(404).json({ error: 'Recipe not found or not deleted' });
    }
});



/*
API endpoint to GET all locations
*/
router.get('/locations', async (req, res) => {
    const locations = await appService.fetchAllLocations();
    if (locations.length === 0) {
        res.status(404).json({ error: 'No locations found' });
    } else {
        res.json({ data: locations });
    }
});



module.exports = router;


	