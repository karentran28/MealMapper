'use client';

import { useState, useEffect } from "react";
import NavBar from '../components/NavBar';
import RecipeCard from '../components/RecipeCard';
import GroupRecipes from "../util/GroupRecipes";

const Recipes = () => {
    const selectedUser = typeof window !== 'undefined' ? localStorage.getItem('selectedUser') : null;
    const [recipes, setRecipes] = useState([]);
    const [likedByAlRecipes, setLikedByAllRecipes] = useState([]);
    const [displayedRecipes, setDisplayedRecipes] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [cuisineFilter, setCuisineFilter] = useState('');
    const [showCaptions, setShowCaptions] = useState(true);
    const [onlyLiked, setOnlyLiked] = useState(false);
    const [likedRecipes, setLikedRecipes] = useState([]);
    const [cuisineOptions, setCuisineOptions] = useState([]); 

    useEffect(() => {
        // Fetch cuisine options from the backend
        const fetchCuisines = async () => {
            try {
                const response = await fetch('/api/cuisines');
                if (!response.ok) {
                    throw new Error(`Network response was not ok: ${response.statusText}`);
                }
                const { data } = await response.json();
                console.log('Fetched cuisines:', data); 
                setCuisineOptions(data);
            } catch (error) {
                console.error('Error fetching cuisine options:', error);
            }
        };

        fetchCuisines();
    }, []); 

    useEffect(() => {
        const fetchRecipes = async () => {  
            try {
                const params = new URLSearchParams({
                    img: 'true',
                    captionless: showCaptions ? '0' : '1',
                    ...(cuisineFilter && { filter: cuisineFilter }),
                    ...(searchQuery && { id: searchQuery }),
                });

                const response = await fetch(`/api/recipes?${params}`);
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                const { data } = await response.json();
                const groupedRecipes = GroupRecipes(data);
                setRecipes(groupedRecipes);
                setDisplayedRecipes(groupedRecipes); // Initially display all recipes
            } catch (error) {
                console.error('Error fetching recipes:', error);
            }
        };

        fetchRecipes();
    }, [cuisineFilter, searchQuery, showCaptions]);

    useEffect(() => {
        const getLikedRecipes = async () => {
            if (selectedUser) {
                try {
                    const response = await fetch(`/api/recipes/liked/${selectedUser}/`);
                    const data = await response.json();
                    setLikedRecipes(data.data);
                } catch (error) {
                    console.error('Error fetching liked recipes:', error);
                }
            }
        };

        getLikedRecipes();
    }, []);

    useEffect(() => {
        // Update displayedRecipes whenever likedRecipes or onlyLiked changes
        if (onlyLiked) {
            setDisplayedRecipes(recipes.filter(recipe => likedRecipes.includes(recipe.RECIPEID)));
        } else {
            setDisplayedRecipes(recipes);
        }
    }, [recipes, likedRecipes, onlyLiked]);

    const fetchLikedByAllRecipes = async () => {
        try {
            const response = await fetch('/api/recipes/liked-by-all');
            if (!response.ok) {
                throw new Error('Failed to fetch recipes liked by all users');
            }
            const { data } = await response.json();
            const groupedRecipes = GroupRecipes(data);
            setLikedByAllRecipes(groupedRecipes);
            setDisplayedRecipes(groupedRecipes);
        } catch (error) {
            console.error('Error fetching recipes liked by all users:', error);
        }
    };

    const likeAction = async (id) => {
        try {
            if (likedRecipes && likedRecipes.includes(id)) {
                await fetch('api/unlikeRecipe', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ UserID: selectedUser, RecipeID: id }),
                });
            } else {
                await fetch('api/likeRecipe', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ UserID: selectedUser, RecipeID: id }),
                });
            }

            const updatedLikes = await fetch(`/api/recipes/liked/${selectedUser}/`);
            const data = await updatedLikes.json();
            setLikedRecipes(data.data);
            console.log(data.data);

        } catch (error) {
            console.error('Error updating liked recipes:', error);
        }
    };

    return (
        <div>
            <NavBar />
            <div>
                <h1>Recipes</h1>
                <div className="search-filter-bar">
                    <input
                        type="text"
                        placeholder="Search by Recipe Name or ID"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="search-input"
                    />
                    <select
                        value={cuisineFilter}
                        onChange={(e) => setCuisineFilter(e.target.value)}
                        className="cuisine-select"
                    >
                        <option value="">All Cuisines</option>
                        {cuisineOptions.map((cuisine, index) => (
                            <option key={index} value={cuisine}>{cuisine}</option>
                        ))}
                    </select>
                    <label className="caption-toggle">
                        <input
                            type="checkbox"
                            checked={showCaptions}
                            onChange={(e) => setShowCaptions(e.target.checked)}
                        />
                        Show Captions
                    </label>
                    <label className="caption-toggle">
                        <input
                            type="checkbox"
                            checked={onlyLiked}
                            onChange={(e) => setOnlyLiked(e.target.checked)}
                        />
                        Liked Recipes
                    </label>
                    <button onClick={() => setDisplayedRecipes(recipes)}>
                        Show All Recipes
                    </button>
                    <button onClick={fetchLikedByAllRecipes}>
                        Recipes Liked by All Users
                    </button>
                </div>
                <div className='recipe-grid'>
                    {displayedRecipes && displayedRecipes.length > 0 ? (
                        displayedRecipes.map((recipe, index) => (
                            <RecipeCard
                                key={index}
                                id={recipe.RECIPEID}
                                name={recipe.RECIPENAME}
                                cuisine={recipe.CUISINE}
                                level={recipe.RECIPELEVEL}
                                time={recipe.COOKINGTIME}
                                createdBy={recipe.USERNAME}
                                imageUrl={recipe.IMAGEURL}
                                caption={showCaptions ? recipe.CAPTION : ''}
                                liked={(likedRecipes ? likedRecipes.includes(recipe.RECIPEID) : false)}
                                callback={likeAction}
                            />
                        ))
                    ) : (
                        <p>No recipes found.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Recipes;
