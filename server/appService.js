const oracledb = require('oracledb');
const loadEnvFile = require('./utils/envUtil');

const envVariables = loadEnvFile('./.env');

// Database configuration setup. Ensure your .env file has the required database credentials.
const dbConfig = {
    user: envVariables.ORACLE_USER,
    password: envVariables.ORACLE_PASS,
    connectString: `${envVariables.ORACLE_HOST}:${envVariables.ORACLE_PORT}/${envVariables.ORACLE_DBNAME}`,
    poolMin: 1,
    poolMax: 3,
    poolIncrement: 1,
    poolTimeout: 60
};

// initialize connection pool
async function initializeConnectionPool() {
    try {
        await oracledb.createPool(dbConfig);
        console.log('Connection pool started');
    } catch (err) {
        console.error('Initialization error: ' + err.message);
    }
}

async function closePoolAndExit() {
    console.log('\nTerminating');
    try {
        await oracledb.getPool().close(10); // 10 seconds grace period for connections to finish
        console.log('Pool closed');
        process.exit(0);
    } catch (err) {
        console.error(err.message);
        process.exit(1);
    }
}

initializeConnectionPool();

process
    .once('SIGTERM', closePoolAndExit)
    .once('SIGINT', closePoolAndExit);


// ----------------------------------------------------------
// Wrapper to manage OracleDB actions, simplifying connection handling.
async function withOracleDB(action) {
    let connection;
    try {
        connection = await oracledb.getConnection(); // Gets a connection from the default pool 
        return await action(connection);
    } catch (err) {
        console.error(err);
        throw err;
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error(err);
            }
        }
    }
}


// ----------------------------------------------------------
// Core functions for database operations
// Modify these functions, especially the SQL queries, based on your project's requirements and design.

async function testOracleConnection() {
    return await withOracleDB(async (connection) => {
        return true;
    }).catch(() => {
        return false;
    });
}

// Fetch all locations
async function fetchAllLocations() {
    return await withOracleDB(async (connection) => {
        const result = await connection.execute(`
            SELECT Street, City, Province, LocationType
            FROM Locations
            ORDER BY City, Street
        `);
        return result.rows;
    }).catch((err) => {
        console.error(err);
        return [];
    });
}

// Fetch all recipes
async function fetchAllRecipes() {
    return await withOracleDB(async (connection) => {
        const result = await connection.execute(`
            SELECT r.RecipeID, r.RecipeName, r.Cuisine, rc.RecipeLevel, r.CookingTime, u.UserName as CreatedBy
            FROM RecipeCreated2 r
            JOIN RecipeCreated1 rc ON r.Cuisine = rc.Cuisine
            JOIN Users2 u ON r.UserID = u.UserID
            ORDER BY r.RecipeID
        `);
        return result.rows;
    }).catch((err) => {
        console.error(err);
        return [];
    });
}

// Fetch all liked recipes
async function fetchLikedRecipes() {
    return await withOracleDB(async (connection) => {
        const result = await connection.execute(`
            SELECT rl.RecipeID, rc.RecipeName, rc.Cuisine, rc.CookingTime, u.UserName as CreatedBy
            FROM RecipesLiked rl
            JOIN RecipeCreated2 rc ON rl.RecipeID = rc.RecipeID
            JOIN Users2 u ON rc.UserID = u.UserID
            WHERE rl.Liked = 1
            ORDER BY rl.RecipeID
        `);
        return result.rows;
    }).catch((err) => {
        console.error(err);
        return [];
    });
}

// Create a new recipe
async function createRecipe(recipe) {
    return await withOracleDB(async (connection) => {
        const result = await connection.execute(`
            INSERT INTO RecipeCreated2 (RecipeID, RecipeName, Cuisine, CookingTime, UserID)
            VALUES (recipe_seq.NEXTVAL, :recipeName, :cuisine, :cookingTime, :userID)
            RETURNING RecipeID INTO :recipeID
        `, {
            recipeName: recipe.RecipeName,
            cuisine: recipe.Cuisine,
            cookingTime: recipe.CookingTime,
            userID: recipe.UserID,
            recipeID: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
        });
        await connection.commit();
        return result.outBinds.recipeID[0];
    }).catch((err) => {
        console.error(err);
        return null;
    });
}

// Delete a recipe
async function deleteRecipe(recipeID) {
    return await withOracleDB(async (connection) => {
        const result = await connection.execute(`
            DELETE FROM RecipeCreated2
            WHERE RecipeID = :recipeID
        `, [recipeID]);
        await connection.commit();
        return result.rowsAffected;
    }).catch((err) => {
        console.error(err);
        return 0;
    });
}


/*
Given a UserID, returns the User's UserID, Name, points, and corresponding rank
*/
async function fetchUser(UserID) {
    return await withOracleDB(async (connection) => {
        const result = await connection.execute(`
            SELECT u.UserId, u.UserName, u.Points, p.UserLevel
            FROM User2 u
            JOIN User1 p ON u.Points >= p.Points 
            WHERE u.UserID=${UserID}
                AND p.Points = (
                    SELECT MAX(Points)
                    FROM User1
                    WHERE u.Points >= Points
            )`);
        return result.rows;
    }).catch(() => {    
        return [];
    });
}


/*
Returns UserIDs, Names, points, and corresponding ranks for all users
*/
async function fetchAllUsers(UserID) {
    return await withOracleDB(async (connection) => {
        const result = await connection.execute(`
            SELECT u.UserId, u.UserName, u.Points, p.UserLevel
            FROM User2 u
            JOIN User1 p ON u.Points >= p.Points 
            WHERE p.Points = (
                SELECT MAX(Points)
                FROM User1
                WHERE u.Points >= Points
                )
            ORDER BY u.UserID`);
        return result.rows;
    }).catch(() => {    
        return [];
    });
}


/*
Returns all pantries associated with UserID
*/
async function fetchPantries(UserID) {
    return await withOracleDB(async (connection) => {
        const result = await connection.execute(`
            SELECT u.UserID, u.PantryID, p.Category
            FROM UserPantries u
            JOIN SavedPantry p
            ON u.PantryID = p.PantryID
            WHERE u.UserID = ${UserID}`);
        return result.rows;
    }).catch(() => {    
        return [];
    });
}



async function fetchRecipeByID(RecipeID) {
    return await withOracleDB(async (connection) => {
        const result = await connection.execute(`
            SELECT r.RecipeID, r.RecipeName, r.Cuisine, r.CookingTime, u.UserName as CreatedBy
            FROM RecipeCreated2 r
            JOIN Users2 u ON r.UserID = u.UserID
            WHERE r.RecipeID = :recipeID
        `, [RecipeID]);
        return result.rows;
    }).catch((err) => {
        console.error(err);
        return [];
    });
}



// Update an existing recipe
async function updateRecipe(recipe) {
    return await withOracleDB(async (connection) => {
        const result = await connection.execute(`
            UPDATE RecipeCreated2
            SET RecipeName = :recipeName,
                Cuisine = :cuisine,
                CookingTime = :cookingTime,
                UserID = :userID
            WHERE RecipeID = :recipeID
        `, {
            recipeName: recipe.RecipeName,
            cuisine: recipe.Cuisine,
            cookingTime: recipe.CookingTime,
            userID: recipe.UserID,
            recipeID: recipe.RecipeID
        });
        await connection.commit();
        return result.rowsAffected;
    }).catch((err) => {
        console.error(err);
        return 0;
    });
}




module.exports = {
    fetchUser,
    fetchAllUsers,
    fetchPantries,
    testOracleConnection,
    fetchAllRecipes,
    fetchRecipeByID,
    createRecipe,
    updateRecipe,
    deleteRecipe,
    fetchAllLocations,
    fetchLikedRecipes
};

