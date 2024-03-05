function getPersonalityDetails(selectedPersonalityTitle) {
    // Define your logic to retrieve steps and teach based on selectedPersonalityTitle
    let steps = "";
    let teach = "";

    // Example logic, replace this with your actual logic
    if (selectedPersonalityTitle === "Creative Writing") {
        steps = `[Explanation, Assessment of users Writing Level,Feedback on Your Writing,Guidance on Improvement,Rewriting for Improvement,Collaborative Writing Exercise.]
   `;
        teach = "how to write creatively";
    } else if (selectedPersonalityTitle === "Extrovert") {
        steps = "Steps for extroverts";
        teach = "Teaching extroverts";
    } else {
        // Default values if no match is found
        steps = "Default steps";
        teach = "Default teaching";
    }

    return { steps, teach };
}

// Attach the function to the global object
window.getPersonalityDetails = getPersonalityDetails;
