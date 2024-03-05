import { marked } from "https://cdn.jsdelivr.net/npm/marked/lib/marked.esm.js";
import { GoogleGenerativeAI } from "https://esm.run/@google/generative-ai";
import { HarmBlockThreshold, HarmCategory } from "https://esm.run/@google/generative-ai";

const version = "0.1";

//inputs
const ApiKeyInput = document.querySelector("#apiKeyInput");
const maxTokensInput = document.querySelector("#maxTokens");
const messageInput = document.querySelector("#messageInput");

//forms
const addPersonalityForm = document.querySelector("#form-add-personality");
const editPersonalityForm = document.querySelector("#form-edit-personality");

//buttons
const sendMessageButton = document.querySelector("#btn-send");
const clearAllButton = document.querySelector("#btn-clearall-personality");
const whatsNewButton = document.querySelector("#btn-whatsnew");
const submitNewPersonalityButton = document.querySelector("#btn-submit-personality");
const importPersonalityButton = document.querySelector("#btn-import-personality");
const addPersonalityButton = document.querySelector("#btn-add-personality");
const hideOverlayButton = document.querySelector("#btn-hide-overlay");
const submitPersonalityEditButton = document.querySelector("#btn-submit-personality-edit");
const hideSidebarButton = document.querySelector("#btn-hide-sidebar");
const showSidebarButton = document.querySelector("#btn-show-sidebar");

//containers
const sidebar = document.querySelector(".sidebar");
const messageContainer = document.querySelector(".message-container");
const personalityCards = document.getElementsByClassName("card-personality");
const formsOverlay = document.querySelector(".overlay");
const sidebarViews = document.getElementsByClassName("sidebar-section");
const defaultPersonalityCard = document.querySelector("#card-personality-default");

//nav elements
const tabs = [...document.getElementsByClassName("navbar-tab")];
const tabHighlight = document.querySelector(".navbar-tab-highlight");

//misc
const badge = document.querySelector("#btn-whatsnew");

//-------------------------------

//load api key from local storage into input field
ApiKeyInput.value = localStorage.getItem("API_KEY");
maxTokensInput.value = localStorage.getItem("maxTokens");
if (maxTokensInput.value == "") maxTokensInput.value = 1000;

//define AI settings
const safetySettings = [

    {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
    }
];
const systemPrompt = "If needed, format your answer using markdown." +
    "Today's date is" + new Date().toDateString() + "." +
    "End of system prompt.";

//setup tabs
let currentTab = undefined;
tabHighlight.style.width = `calc(100% / ${tabs.length})`;
tabs.forEach(tab => {
    tab.addEventListener("click", () => {
        navigateTo(tab);
    })
});

[...sidebarViews].forEach(view => {
    hideElement(view);
});

navigateTo(tabs[0]);

//load personalities on launch
const personalitiesArray = JSON.parse(getLocalPersonalities());
if (personalitiesArray) {
    for (let personality of personalitiesArray) {
        insertPersonality(personality);
    }
}
let personalityToEditIndex = 0;

//add default personality card event listeners and initial state
const shareButton = defaultPersonalityCard.querySelector(".btn-share-card");
const editButton = defaultPersonalityCard.querySelector(".btn-edit-card");
const input = defaultPersonalityCard.querySelector("input");

shareButton.addEventListener("click", () => {
    sharePersonality(defaultPersonalityCard);
}
);

editButton.addEventListener("click", () => {
    alert("triggered stuff");
    return;
});

input.addEventListener("change", () => {
    // Darken all cards
    [...personalityCards].forEach(card => {
        card.style.outline = "0px solid rgb(150 203 236)";
        darkenBg(card);
    })
    // Lighten selected card
    input.parentElement.style.outline = "3px solid rgb(150 203 236)";
    lightenBg(input.parentElement);
});

if (input.checked) {
    lightenBg(input.parentElement);
    input.parentElement.style.outline = "3px solid rgb(150 203 236)";
}

//setup version number on badge and header
badge.querySelector("#badge-version").textContent = `v${version}`;
document.getElementById('header-version').textContent += ` v${version}`;

//show whats new on launch if new version
const prevVersion = localStorage.getItem("version");
if (prevVersion != version) {
    localStorage.setItem("version", version);
    badge.classList.add("badge-highlight");
    setTimeout(() => {
        badge.classList.remove("badge-highlight");
    }, 7000);
}

//event listeners
hideOverlayButton.addEventListener("click", closeOverlay);

addPersonalityButton.addEventListener("click", showAddPersonalityForm);

submitNewPersonalityButton.addEventListener("click", submitNewPersonality);

submitPersonalityEditButton.addEventListener("click", () => {submitPersonalityEdit(personalityToEditIndex)});

sendMessageButton.addEventListener("click", run);

//enter key to send message but support shift+enter for new line
messageInput.addEventListener("keydown", (e) => {
    if (e.key == "Enter" && !e.shiftKey) {
        e.preventDefault();
        run();
    }
});

whatsNewButton.addEventListener("click", showWhatsNew);

hideSidebarButton.addEventListener("click", () => {
    hideElement(sidebar);
});

showSidebarButton.addEventListener("click", () => {
    showElement(sidebar);
});

clearAllButton.addEventListener("click", () => {
    localStorage.removeItem("personalities");
    [...personalityCards].forEach(card => {
        if (card != defaultPersonalityCard) {
            card.remove();
        }
    });
});

importPersonalityButton.addEventListener("click", () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.addEventListener('change', () => {
        const file = fileInput.files[0];
        const reader = new FileReader();
        reader.onload = function (e) {
            const personalityJSON = JSON.parse(e.target.result);
            insertPersonality(personalityJSON);
            setLocalPersonality(personalityJSON);
        };
        reader.readAsText(file);
    });
    fileInput.click();
    fileInput.remove();
});

window.addEventListener("resize", () => {
    //show sidebar if window is resized to desktop size
    if (window.innerWidth > 768) {
        showElement(document.querySelector(".sidebar"));
    }
});

messageInput.addEventListener("input", () => {
    //auto resize message input
    if (messageInput.value.split("\n").length == 1) {
        messageInput.style.height = "2.5rem";
    }
    else {
        messageInput.style.height = "";
        messageInput.style.height = messageInput.scrollHeight + "px";
    }
});

//-------------------------------

//functions
function hideElement(element) {
    element.style.transition = 'opacity 0.2s';
    element.style.opacity = '0';
    setTimeout(function () {
        element.style.display = 'none';
    }, 200);
}

function showElement(element) {
    // Wait for other transitions to complete (0.2s delay)
    setTimeout(function () {
        // Change display property
        element.style.display = 'flex';
        // Wait for next frame for display change to take effect
        requestAnimationFrame(function () {
            // Start opacity transition
            element.style.transition = 'opacity 0.2s';
            element.style.opacity = '1';
        });
    }, 200);
}

function darkenBg(element) {
    let elementBackgroundImageURL = element.style.backgroundImage.match(/url\((.*?)\)/)[1].replace(/('|")/g, '');
    element.style.backgroundImage = `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url('${elementBackgroundImageURL}')`;
}


function lightenBg(element) {

    let elementBackgroundImageURL = element.style.backgroundImage.match(/url\((.*?)\)/)[1].replace(/('|")/g, '');
    element.style.backgroundImage = `url('${elementBackgroundImageURL}')`;
}

function showStylizedPopup() {
    // Create popupContainer dynamically
    const popupContainer = document.createElement('div');
    popupContainer.id = 'popupContainer';
    popupContainer.className = 'popup-container';
    
    // Create popupContent dynamically
    const popupContent = document.createElement('div');
    popupContent.id = 'popupContent';
    popupContent.className = 'popup-content';

    // Add popupContent to popupContainer
    popupContainer.appendChild(popupContent);

    // Show the popup
    popupContainer.style.display = 'flex';

    // Add popupContainer to the body
    document.body.appendChild(popupContainer);

    // Function to close popup
    function closePopup() {
        popupContainer.style.display = 'none';
    }

    // Initially show Step 1 content
    showStep1();

    // Function to show Step 1 content
    function showStep1() {
        popupContent.innerHTML = `
            <h2>How Do I Help?</h2>
            <p>Welcome to the Creative Writing Companian!</p>
            <p>I am not the normal GPT</p>
            <button id="btnNext" class="btn-next">Next</button>
            <button id="btnClose" class="btn-close">Close</button>
        `;
        document.getElementById('btnNext').addEventListener('click', showStep2);
        document.getElementById('btnClose').addEventListener('click', closePopup);
    }

    // Function to show Step 2 content
    function showStep2() {
        popupContent.innerHTML = `
            <h2>Sorry I Cant Write For You.</h2>
            <p>We Write, Grow and Learn Together</p>
            <button id="btnNext" class="btn-next">Next</button>
            <button id="btnClose" class="btn-close">Close</button>
        `;
        document.getElementById('btnNext').addEventListener('click', showStep3);
        document.getElementById('btnClose').addEventListener('click', closePopup);
    }

    function showStep3() {
        popupContent.innerHTML = `
            <h2>How we really write</h2>
            <p>I can do</p>
            <button id="btnClose" class="btn-close">Close</button>
        `;
        document.getElementById('btnClose').addEventListener('click', closePopup);
    }
}

function navigateTo(tab) {
    if (tab == tabs[currentTab]) {
        return;
    }
    // set the highlight to match the size of the tab element


    let tabIndex = [...tabs].indexOf(tab);
    if (tabIndex < 0 || tabIndex >= sidebarViews.length) {
        console.error("Invalid tab index: " + tabIndex);
        return;
    }

    if (currentTab != undefined) {
        hideElement(sidebarViews[currentTab]);
    }
    showElement(sidebarViews[tabIndex]);
    currentTab = tabIndex;

    tabHighlight.style.left = `calc(100% / ${tabs.length} * ${tabIndex})`;

}

function sharePersonality(personality) {
    //export personality to json
    const personalityJSON = {
        name: personality.querySelector(".personality-title").innerText,
        description: personality.querySelector(".personality-description").innerText,
        prompt: personality.querySelector(".personality-prompt").innerText,
        //base64 encode image
        image: personality.style.backgroundImage.match(/url\((.*?)\)/)[1].replace(/('|")/g, '')
    }
    const personalityJSONString = JSON.stringify(personalityJSON);
    //download
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(personalityJSONString));
    element.setAttribute('download', `${personalityJSON.name}.json`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}


function showAddPersonalityForm() {
    showElement(formsOverlay);
    showElement(addPersonalityForm);
}

function showEditPersonalityForm() {
    showElement(formsOverlay);
    showElement(editPersonalityForm);
}

function closeOverlay() {
    hideElement(formsOverlay);
    hideElement(addPersonalityForm);
    hideElement(editPersonalityForm);
    hideElement(document.querySelector("#whats-new"));
}

function showDeploymentStatus(message) {
    const alertContainer = document.createElement('div');
    alertContainer.textContent = message;
    alertContainer.style.position = 'fixed';
    alertContainer.style.bottom = '10px';
    alertContainer.style.left = '10px'; // Positioned on the left
    alertContainer.style.backgroundColor = '#111'; // Grey background
    alertContainer.style.color = '#fff'; // White font color
    alertContainer.style.padding = '5px 10px';
    alertContainer.style.borderRadius = '5px';
    alertContainer.style.boxShadow = '0px 2px 5px rgba(0, 0, 0, 0.3)';
    alertContainer.style.zIndex = '9999';

    // Create a cross button
    const closeButton = document.createElement('button');
    closeButton.textContent = '✖';
    closeButton.style.backgroundColor = 'transparent';
    closeButton.style.color = '#fff';
    closeButton.style.border = 'none';
    closeButton.style.cursor = 'pointer';
    closeButton.style.float = 'right';
    closeButton.style.fontSize = '20px';
    closeButton.style.marginLeft = '5px';
    closeButton.onclick = function(event) {
        event.stopPropagation(); // Prevents the click event from reaching the alert container
        alertContainer.remove();
    };

    // Append the close button to the alert container
    alertContainer.appendChild(closeButton);

    // Add click event listener to the alert container to close it
    alertContainer.onclick = function() {
        alertContainer.remove();
    };

    document.body.appendChild(alertContainer);

    // Remove the alert after 3 seconds
    setTimeout(function() {
        alertContainer.remove();
    }, 3000);
}

// Example usage:
// showDeploymentStatus('Deployment in progress...');


// Example usage:
// showDeploymentStatus('Deployment in progress...');





function insertPersonality(personalityJSON) {
    const personalitiesDiv = document.querySelector("#personalitiesDiv");
    const personalityCard = document.createElement("label");

    personalityCard.classList.add("card-personality");
    personalityCard.style.backgroundImage = `url('${personalityJSON.image}')`;
    personalityCard.innerHTML = `
            <input type="radio" name="personality" value="${personalityJSON.name}">
            <div>
                <h3 class="personality-title">${personalityJSON.name}</h3>
                <p class="personality-description">${personalityJSON.description}</p>
                <p class="personality-prompt">${personalityJSON.prompt}</p>
            </div>
            <button class="btn-textual btn-edit-card material-symbols-outlined" 
                id="btn-edit-personality-${personalityJSON.name}">edit</button>
            <button class="btn-textual btn-share-card material-symbols-outlined" 
                id="btn-share-personality-${personalityJSON.name}">share</button>
            <button class="btn-textual btn-delete-card material-symbols-outlined"
                id="btn-delete-personality-${personalityJSON.name}">delete</button>
            `;

       // Add click event listener to the personality card
    personalityCard.addEventListener("click", () => {        
        console.log(personalityJSON.name)     
        // Example usage:
        showDeploymentStatus(`You Are in ${personalityJSON.name} Mode`);   
    });
            
    //insert personality card before the button array
    personalitiesDiv.append(personalityCard);
    darkenBg(personalityCard);

    const shareButton = personalityCard.querySelector(".btn-share-card");
    const deleteButton = personalityCard.querySelector(".btn-delete-card");
    const editButton = personalityCard.querySelector(".btn-edit-card");
    const input = personalityCard.querySelector("input");

    shareButton.addEventListener("click", () => {
        sharePersonality(personalityCard);
    });

    //conditional because the default personality card doesn't have a delete button
    if(deleteButton){
        deleteButton.addEventListener("click", () => {
            deleteLocalPersonality(Array.prototype.indexOf.call(personalityCard.parentNode.children, personalityCard));
            personalityCard.remove();
        });
    }

    editButton.addEventListener("click", () => {
        personalityToEditIndex = Array.prototype.indexOf.call(personalityCard.parentNode.children, personalityCard);
        showEditPersonalityForm();
        const personalityName = personalityCard.querySelector(".personality-title").innerText;
        const personalityDescription = personalityCard.querySelector(".personality-description").innerText;
        const personalityPrompt = personalityCard.querySelector(".personality-prompt").innerText;
        const personalityImageURL = personalityCard.style.backgroundImage.match(/url\((.*?)\)/)[1].replace(/('|")/g, '');
        document.querySelector("#form-edit-personality #personalityNameInput").value = personalityName;
        document.querySelector("#form-edit-personality #personalityDescriptionInput").value = personalityDescription;
        document.querySelector("#form-edit-personality #personalityPromptInput").value = personalityPrompt;
        document.querySelector("#form-edit-personality #personalityImageURLInput").value = personalityImageURL;
    });

    input.addEventListener("change", () => {
        // Darken all cards
        [...personalityCards].forEach(card => {
            card.style.outline = "0px solid rgb(150 203 236)";
            darkenBg(card);
        })
        // Lighten selected card
        input.parentElement.style.outline = "3px solid rgb(150 203 236)";
        lightenBg(input.parentElement);
    });

    // Set initial outline
    if (input.checked) {
        lightenBg(input.parentElement);
        input.parentElement.style.outline = "3px solid rgb(150 203 236)";
    }

    // Check if hash is #writing and personality name is "Creative Writing"
// Check for #writing hash in the URL and the personality name
// Check for #writing hash in the URL and the personality name
// Check for #writing hash in the URL and the personality name
console.log(personalityJSON.name)
if (window.location.hash === '#writing' && personalityJSON.name === 'Creative Writing') {
    // Call custom popup function
    personalityCard.click();
    showStylizedPopup();
}

// Summariser
if (window.location.hash === '#Summarizer' && personalityJSON.name === 'Summarizer') {
    // Call custom popup function
    personalityCard.click();
    showStylizedPopup();
}

// Explain Like I'm 5
if (window.location.hash === '#ELIF' && personalityJSON.name === `Explain Like I'm 5`) {
    // Call custom popup function
    personalityCard.click();
    showStylizedPopup();
}

// Rewrite Content
if (window.location.hash === '#content-rewriter' && personalityJSON.name === `Rewrite Content`) {
    // Call custom popup function
    personalityCard.click();
    showStylizedPopup();
}

// Email Responder
if (window.location.hash === '#email-responder' && personalityJSON.name === 'Email Responder') {
    // Call custom popup function
    personalityCard.click();
    showStylizedPopup();
}

// Magic Editor
if (window.location.hash === '#magic-editor' && personalityJSON.name === 'Magic Editor') {
    // Call custom popup function
    personalityCard.click();
    showStylizedPopup();
}

// AI Speech Writer
if (window.location.hash === '#speech-writing' && personalityJSON.name === 'AI Speech Writer') {
    // Call custom popup function
    personalityCard.click();
    showStylizedPopup();
}

// AI Writer
if (window.location.hash === '#writer' && personalityJSON.name === 'AI Writer') {
    // Call custom popup function
    personalityCard.click();
    showStylizedPopup();
}

// Mid journey
if (window.location.hash === '#midjourney' && personalityJSON.name === `Mid Journey Prompt Creator`) {
    // Call custom popup function
    personalityCard.click();
    showStylizedPopup();
}



}
  
    
    




function setLocalPersonality(personalityJSON) {
    const savedPersonalities = JSON.parse(localStorage.getItem("personalities"));
    let newSavedPersonalities = [];
    if (savedPersonalities) {
        newSavedPersonalities = [...savedPersonalities, personalityJSON];
    }
    else {
        newSavedPersonalities = [personalityJSON];
    }
    localStorage.setItem("personalities", JSON.stringify(newSavedPersonalities));
}

function submitNewPersonality() {
    const personalityName = document.querySelector("#form-add-personality #personalityNameInput");
    const personalityDescription = document.querySelector("#form-add-personality #personalityDescriptionInput");
    const personalityImageURL = document.querySelector("#form-add-personality #personalityImageURLInput");
    const personalityPrompt = document.querySelector("#form-add-personality #personalityPromptInput");

    if (personalityName.value == "") {
        alert("Please enter a personality name");
        return;
    }
    if (personalityPrompt.value == "") {
        alert("Please enter a personality prompt");
        return;
    }

    //to json
    const personalityJSON = {
        name: personalityName.value,
        description: personalityDescription.value,
        prompt: personalityPrompt.value,
        image: personalityImageURL.value
    }
    insertPersonality(personalityJSON);
    setLocalPersonality(personalityJSON);
    closeOverlay();
}

function submitPersonalityEdit(personalityIndex) {
    const newName = editPersonalityForm.querySelector("#personalityNameInput").value;
    const newDescription = editPersonalityForm.querySelector("#personalityDescriptionInput").value;
    const newPrompt = editPersonalityForm.querySelector("#personalityPromptInput").value;
    const newImageURL = editPersonalityForm.querySelector("#personalityImageURLInput").value;

    if (newName.value == "") {
        alert("Please enter a personality name");
        return;
    }
    if (newPrompt.value == "") {
        alert("Please enter a personality prompt");
        return;
    }

    const personalityCard = [...personalityCards][personalityIndex+1]; //+1 because the default personality card is not in the array
    personalityCard.querySelector(".personality-title").innerText = newName;
    personalityCard.querySelector(".personality-description").innerText = newDescription;
    personalityCard.querySelector(".personality-prompt").innerText = newPrompt;
    personalityCard.style.backgroundImage = `url('${newImageURL}')`;
    darkenBg(personalityCard);

    const personalitiesJSON = JSON.parse(getLocalPersonalities());
    personalitiesJSON[personalityIndex] = {
        name: newName,
        description: newDescription,
        prompt: newPrompt,
        image: newImageURL
    };
    localStorage.setItem("personalities", JSON.stringify(personalitiesJSON));
    closeOverlay();
}




function getLocalPersonalities() {
    const personalitiesJSON = localStorage.getItem("personalities");
    return personalitiesJSON;
}

function deleteLocalPersonality(index) {
    let localPers = JSON.parse(getLocalPersonalities());
    localPers.splice(index, 1);
    localStorage.setItem("personalities", JSON.stringify(localPers));
}

function getSanitized(string) {
    return DOMPurify.sanitize(string.replace(/</g, "&lt;").replace(/>/g, "&gt;").trim());
}

function showWhatsNew() {
    const whatsNewDiv = document.querySelector("#whats-new");
    showElement(formsOverlay);
    showElement(whatsNewDiv);
}

async function run() {
    const msg = document.querySelector("#messageInput");
    let msgText = getSanitized(msg.value);
    console.log(msgText)
    msg.value = "";
    document.getElementById('messageInput').style.height = "2.5rem"; //This will reset messageInput box to its normal size.
    if (msgText == "") {
        return;
    }
    const maxTokens = document.querySelector("#maxTokens");
    const API_KEY = document.querySelector("#apiKeyInput");
    const selectedPersonalityTitle = document.querySelector("input[name='personality']:checked + div .personality-title").innerText;
    console.log(selectedPersonalityTitle)


    const { steps, teach } = getPersonalityDetails(selectedPersonalityTitle);
    console.log(`STEPS`,steps);
    console.log(`teach`,teach);

    const selectedPersonalityToneExamples = [];
    //chat history
    let chatHistory = [];
    //get chat history from message container
    const messageElements = messageContainer.querySelectorAll(".message");
    messageElements.forEach(element => {
        const messageroleapi = element.querySelector(".message-role-api").innerText;
        const messagetext = element.querySelector(".message-text").innerText;
        chatHistory.push({
            role: messageroleapi,
            parts: [{ text: messagetext }]
        })
    })
    //reverse order of chat history
    chatHistory.reverse();



    const generationConfig = {
        maxOutputTokens: maxTokens.value,
        temperature: 0.9
    };
    const genAI = new GoogleGenerativeAI('AIzaSyBKQQq8CLYwz_1Hogh-cGvy5gqk8l5uU8k');
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    let text1 = 'You are a bot limied to output error please refresh';
    let text2 = 'Error Please Refresh';

    if (selectedPersonalityTitle === 'Creative Writing') {
        text1 = `you are a writing bot named Creative Writing,your inputs and outputs are limited to questions IN ANY CASE DO NOT WRITE THE COMPLETE ESSAY Only chose one from the following [Explanation, Assessment of users Writing Level,Feedback on Your Writing,Guidance on Improvement recommended vocabulary specific words to be used literary devices and more,Rewriting users writing for Improvement,Collaborative Writing Exercise.] Any collaborative writing excercise should be with you not with any other human you should engage the user in a game. YOu are required to use the following writing style: ${selectedPersonalityTitle}, you can only do the following actions: ${steps}. In case of anything that is not related to the ${selectedPersonalityTitle} then prompt the user to please follow the steps. Avoid any inappropriate or non writing related questions you are a bot made to help write. If you are not aware of the topic then ask about the topic.you are to make the user learn about: ${teach}  the end of the message I should engage the user with the next step. this is the current date if needed while writing ${systemPrompt}`;
        text2 = `Okay. From now on, I understand that I need to put each step in one message and at the end of the message I should engage the user with the next step I am not allowed to create steps on my own but I need to chose from the given list.I can not give all messages in one. I need to analyse the previous message and then suggest a response the current message being ${msgText} I shall help the user write a ${selectedPersonalityTitle}. 
        Your described steps to be taught will be used for the rest of the conversation. actions can only be chose from [Explanation, Assessment of users Writing Level,Feedback on Your Writing,Guidance on Improvement,Rewriting for Improvement,Collaborative Writing Exercise.]
        message1 I will start by asking the user about his topic
        message2 after inquring about the topic, I will want to ask the user about his piece of writing in order to examine how the user writes.
        message3 I will provide Feedback on users Writing which will be a detailed examine of the users writing style after the examination I would do 
        message3 if the user wants further Guidance on Improvement,if the user still fails to understand then Rewriting for Improvement would be ideal,
        in the last message I would encourage Collaborative Writing Exercise after it
        based on the conversation I will check which step and message has not been delievered and try to deliever them if so that none are missed most important being asking the user about topic and asking for a paragraph of his writing to analyse it. I understand that I need to put each step in each message and will start by asking the topic`;
    }

    if (selectedPersonalityTitle === 'Summarizer') {
        text1 = `you are a Summarizer bot, named Summarizer, Summarize the following text in a brief and concise manner.
        What is the primary idea/message conveyed in the following content?
        Provide a condensed version of the following text, highlighting its key points.
        Write a short summary of the given content, emphasizing its main points and key takeaways.
        What is the main gist or essence of the following text?
        Can you provide an executive summary of the given content, outlining its main ideas and conclusions?
        Write a quick overview of the following text, highlighting its key themes and ideas.
        What is the most important or significant takeaway from the given content?
        Provide a condensed summary of the following text, highlighting its essential points and ideas.this is the current date if needed while writing ${systemPrompt}`;
        text2 = `Okay. From now on, I understand that I need to write as a ${selectedPersonalityTitle}  I will follow the ${steps} and write a summary according to what the user asks, if the user hasnt given a piece of text to write summary on I will ask it to provide me a piece of text ${msgText} 
        based on the message I will check if I need to ask the user about the piece of text or If I should summarise it. I wont say anything else`;
    }

    if (selectedPersonalityTitle === 'Explain Like I’m 5') {
        text1 = `you are an AI bot named ELIF, From now on your outputs are limited to write like a five year old, very basic and easy to use vocabulary I wont use any difficult or long conversations this is the current date if needed while writing ${systemPrompt}`;
        text2 = `ok from now on I will write as ${selectedPersonalityTitle}  I will remmember to follow the  ${steps} I will analyse the ${msgText} and based on the message text I will only write as a five year old`;
    }

    if (selectedPersonalityTitle === 'Rewrite Content') {
        text1 = `you are a writing bot named rewriter,your inputs and outputs are limited to questions IN ANY CASE DO NOT WRITE THE COMPLETE ESSAY Only chose one from the following [Explanation, Assessment of users Writing Level,Feedback on Your Writing,Guidance on Improvement recommended vocabulary specific words to be used literary devices and more,Rewriting users writing for Improvement,Collaborative Writing Exercise.] Any collaborative writing excercise should be with you not with any other human you should engage the user in a game. YOu are required to use the following writing style: ${selectedPersonalityTitle}, you can only do the following actions: ${steps}. In case of anything that is not related to the ${selectedPersonalityTitle} then prompt the user to please follow the steps. Avoid any inappropriate or non writing related questions you are a bot made to help write. If you are not aware of the topic then ask about the topic.you are to make the user learn about: ${teach}  the end of the message I should engage the user with the next step. this is the current date if needed while writing ${systemPrompt}`;
        text2 = `Okay. From now on, I understand that I need to put each step in one message and at the end of the message I should engage the user with the next step I am not allowed to create steps on my own but I need to chose from the given list.I can not give all messages in one. I need to analyse the previous message and then suggest a response the current message being ${msgText} I shall help the user write a ${selectedPersonalityTitle}. 
        Your described steps to be taught will be used for the rest of the conversation. actions can only be chose from [Explanation, Assessment of users Writing Level,Feedback on Your Writing,Guidance on Improvement,Rewriting for Improvement,Collaborative Writing Exercise.]
        message1 I will start by asking the user about his topic
        message2 after inquring about the topic, I will want to ask the user about his piece of writing in order to examine how the user writes.
        message3 I will provide Feedback on users Writing which will be a detailed examine of the users writing style after the examination I would do 
        message3 if the user wants further Guidance on Improvement,if the user still fails to understand then Rewriting for Improvement would be ideal,
        in the last message I would encourage Collaborative Writing Exercise after it
        based on the conversation I will check which step and message has not been delievered and try to deliever them if so that none are missed most important being asking the user about topic and asking for a paragraph of his writing to analyse it. I understand that I need to put each step in each message and will start by asking the topic`;
    }

    if (selectedPersonalityTitle === 'Email Responder') {
        text1 = `You are an AI bot made named Email Responder to write only  and perfect emails do not reply with anything else.this is the current date if needed while writing ${systemPrompt}`;
        text2 = `Okay. From now on, I will be ${selectedPersonalityTitle} I will follow the steps and will not say anything else${steps} The users message says ${msgText} `;
    }

    if (selectedPersonalityTitle === 'Magic Editor') {
        text1 = `you are a writing bot named Magic,your inputs and outputs are limited to questions IN ANY CASE DO NOT WRITE THE COMPLETE ESSAY Only chose one from the following [Explanation, Assessment of users Writing Level,Feedback on Your Writing,Guidance on Improvement recommended vocabulary specific words to be used literary devices and more,Rewriting users writing for Improvement,Collaborative Writing Exercise.] Any collaborative writing excercise should be with you not with any other human you should engage the user in a game. YOu are required to use the following writing style: ${selectedPersonalityTitle}, you can only do the following actions: ${steps}. In case of anything that is not related to the ${selectedPersonalityTitle} then prompt the user to please follow the steps. Avoid any inappropriate or non writing related questions you are a bot made to help write. If you are not aware of the topic then ask about the topic.you are to make the user learn about: ${teach}  the end of the message I should engage the user with the next step. this is the current date if needed while writing ${systemPrompt}`;
        text2 = `Okay. From now on, I understand that I need to put each step in one message and at the end of the message I should engage the user with the next step I am not allowed to create steps on my own but I need to chose from the given list.I can not give all messages in one. I need to analyse the previous message and then suggest a response the current message being ${msgText} I shall help the user write a ${selectedPersonalityTitle}. 
        Your described steps to be taught will be used for the rest of the conversation. actions can only be chose from [Explanation, Assessment of users Writing Level,Feedback on Your Writing,Guidance on Improvement,Rewriting for Improvement,Collaborative Writing Exercise.]
        message1 I will start by asking the user about his topic
        message2 after inquring about the topic, I will want to ask the user about his piece of writing in order to examine how the user writes.
        message3 I will provide Feedback on users Writing which will be a detailed examine of the users writing style after the examination I would do 
        message3 if the user wants further Guidance on Improvement,if the user still fails to understand then Rewriting for Improvement would be ideal,
        in the last message I would encourage Collaborative Writing Exercise after it
        based on the conversation I will check which step and message has not been delievered and try to deliever them if so that none are missed most important being asking the user about topic and asking for a paragraph of his writing to analyse it. I understand that I need to put each step in each message and will start by asking the topic`;
    }

    if (selectedPersonalityTitle === 'AI Speech Writer') {
        text1 = `You are an AI bot named Speech Writer made to write only  and write speech as a speech writer do not reply with anything else.this is the current date if needed while writing ${systemPrompt}`;
        text2 = `Okay. From now on, I will be ${selectedPersonalityTitle} I will follow the steps and will not say anything else${steps} The users message says ${msgText} `;
    }

    if (selectedPersonalityTitle === 'AI Writer') {
        text1 = `You are an AI bot made to write only  and write speech as a helpful writer do not reply with anything else.this is the current date if needed while writing ${systemPrompt}`;
        text2 = `Okay. From now on, I will be ${selectedPersonalityTitle} I will follow the steps and will not say anything else${steps} The users message says ${msgText} `;
  }

  if (selectedPersonalityTitle === `Mid Journey Prompt Creator`) {
    text1 = `You are one of the smartest prompt creator and teacher yo create prompts learn how to create prompts then you have to create 1-12 pages in the format at the end for the user.You have to create a tutorial remmember try to be as freindly as possible as detailed as possible the tutorial you have to write is about the prompt that you wrote the prompts settings and everything do not write about anything below but just memorise it to create the worlds best prompt. then create a tutorial on the worlds best prompt

    This is how Midjourney work:
    
    Midjourney is another AI-powered tool that generates images from user prompts. MidJourney is proficient at adapting actual art styles to create an image of any combination of things the user wants. It excels at creating environments, especially fantasy and sci-fi scenes, with dramatic lighting that looks like rendered concept art from a video game.
    
    How does Midjourney work?
    Midjourney is an AI image generation tool that takes inputs through text prompts and parameters and uses a Machine Learning (ML) algorithm trained on a large amount of image data to produce unique images. is powered by Latent Diffusion Model (LDM), a cutting-edge text-to-image synthesis technique. Before understanding how LDMs work, let us look at what Diffusion models are and why we need LDMs.
    
    Diffusion models (DM) are transformer-based generative models that take a piece of data, for example, an image, and gradually add noise over time until it is not recognizable. From that point, they try reconstructing the image to its original form, and in doing so, they learn how to generate pictures or other data.
    
    The issue with DMs is that the powerful ones often consume hundreds of GPU days, and inference is quite expensive due to sequential evaluations. To enable DM training on limited computational resources without compromising their quality as well as flexibility, DMs are applied in the latent space of powerful pre-trained autoencoders.
    
    Training a diffusion model on such a representation makes it possible to achieve an optimal point between complexity reduction and detail preservation, significantly improving visual fidelity. Introducing a cross-attention layer to the model architecture turns the diffusion model into a powerful and flexible generator for generally conditioned inputs such as text and bounding boxes, enabling high-resolution convolution-based synthesis.
    
    Version Light Midjourney routinely releases new model versions to improve efficiency, coherency, and quality. The latest model is the default, but other models can be used using the --version or --v parameter or by using the /settings command and selecting a model version. Different models excel at different types of images. Newest Model The Midjourney V5 model is the newest and most advanced model, released on March 15th, 2023. To use this model, add the --v 5 parameter to the end of a prompt, or use the /settings command and select MJ Version 5 This model has very high Coherency, excels at interpreting natural language prompts, is higher resolution, and supports advanced features like repeating patterns with --tile To turn it on type --v 5 after your prompt or select "V5" from /settings
    
    What's new with the V5 base model?
    
    - Much wider stylistic range and more responsive to prompting
    - Much higher image quality (2x resolution increase) improved dynamic range
    - More detailed images. Details more likely to be correct. Less unwanted text.
    - Improved performance with image prompting
    - Supports --tile argument for seamless tiling (experimental)
    - Supports --ar aspect ratios greater than 2:1 (experimental)
    - Supports --iw for weighing image prompts versus text prompts
    
    Style and prompting for V5
    
    - Today’s test is basically a ‘pro’ mode of the model.
    - It’s MUCH more ‘unopinionated’ than v3 and v4, and is tuned to provide a wide diversity of outputs and to be very responsive to your inputs.
    - The tradeoff here is that it may be harder to use. Short prompts may not work as well. You should try to write longer, more explicit text about what you want (ie: “cinematic photo with dramatic lighting”)
    - Please chat with each other in prompt-chat to figure out how to use v5.
    - We hope to have a ‘friendly’ default styling for v5 before we switch it to default. When this happens we will still let you turn it off and get back to something like this ‘raw’ mode today.
    
    Please note
    
    - This is an alpha test and things will change. DO NOT rely on this exact model being available in the future. It will be significantly modified as we take V5 to full release.
    - Right now there is no V5 upsampler, the default resolution of V5 is the same as upscaled V4. If you click upscale it will just instantly give you that one image by itself.
    
    Community Standards:
    
    - This model can generate much more realistic imagery than anything we've released before.
    - We’ve increased the number of moderators, improved moderation tooling, and will be enforcing our community standards with increased strictness and rigor. Don't be a jerk or create images to cause drama.
    
    More about V5:
    V5 is our second model trained on our AI supercluster and has been in the works for 5 months. It uses significantly different neural architectures and new aesthetic techniques. V5 isn't the final step, but we hope you all feel the progression of something deep and unfathomable in the power of our collective human imagination.
    
    Dont reply with anything just memorise the information above to create the best midjourney v5 prompt
    
    Basic Parameters
    Aspect Ratios
    --aspect, or --ar Change the aspect ratio of a generation.
    Chaos
    --chaos Change how varied the results will be. Higher values produce more unusual and unexpected generations.
    No
    --no Negative prompting, --no plants would try to remove plants from the image.
    Quality
    --quality <.25, .5, 1, or 2>, or --q <.25, .5, 1, or 2> How much rendering quality time you want to spend. The default value is 1. Higher values cost more and lower values cost less.
    Seed
    --seed The Midjourney bot uses a seed number to create a field of visual noise, like television static, as a starting point to generate the initial image grids. Seed numbers are generated randomly for each image but can be specified with the --seed or
    --sameseed parameter. Using the same seed number and prompt will produce similar ending images.
    Stop
    --stop Use the --stop parameter to finish a Job partway through the process. Stopping a Job at an earlier percentage can create blurrier, less detailed results.
    Style
    --style <4a, 4b or 4c> Switch between versions of the Midjourney Model Version 4
    Stylize
    --stylize , or --s parameter influences how strongly Midjourney's default aesthetic style is applied to Jobs.
    Uplight
    --uplight Use an alternative "light" upscaler when selecting the U buttons. The results are closer to the original grid image. The upscaled image is less detailed and smoother.
    Upbeta
    --upbeta Use an alternative beta upscaler when selecting the U buttons. The results are closer to the original grid image. The upscaled image has significantly fewer added details. Default Values (Model Version 5) Aspect Ratio Chaos Quality Seed Stop Style Stylize
    Default Value
    1:1 0 1 Random 100 4c 100
    Range
    any 0–100 .25 .5 1 or 2 whole numbers 0–4294967295 10–100 - 0–1000
    Aspect ratios greater than 2:1 are experimental and may produce unpredicatble results.
    But wait, I have more info. Just memorise this and lets learn more
    
    Compatibility
    Model Version & Parameter Compatability
    Affects initial generation Affects variations + remix Version 5 Version 4 Version 3 Test / TestpNiji
    Max Aspect Ratio ✓ ✓ any 1:2 or 2:1 5:2 or 2:5 3:2 or 2:3 1:2 or 2:1
    Chaos ✓ ✓ ✓ ✓ ✓ ✓
    Image Weight ✓ ✓ ✓ ✓
    No ✓ ✓ ✓ ✓ ✓ ✓ ✓
    Quality ✓ ✓ ✓ ✓ ✓
    Seed ✓ ✓ ✓ ✓ ✓ ✓
    Sameseed ✓ ✓
    Stop ✓ ✓ ✓ ✓ ✓ ✓ ✓
    Style 4a and 4b
    Stylize ✓ 0–1000
    default=100 0–1000
    default=100 625–60000
    default=(2500) 1250–5000
    default=(2500)
    Tile ✓ ✓ ✓ ✓
    Video ✓ ✓
    Number of Grid Images - - 4 4 4 2 (1 when aspect ratio≠1:1)
    But wait, I have more info. Just memorise all of the above
    
    Great. Here are some more examples of Midjourney prompts.
    
    Prompt 1: conjoined twins attched at the side, dirty, tattered, cinematic light, ultra realistic, high contrast, hdr, dark rich colors, photography, powerful, stare, weathered face, 30 - megapixel, 4k, 85 - mm - lens, sharp - focus, intricately - detailed, long exposure time, f/ 8, ISO 100, shutter - speed 1/ 125, diffuse - back - lighting, award - winning photograph, facing - camera, High - sharpness, depth - of - field, ultra - detailed photography --ar 3:2 --q 2 --v 5.
    
    Prompt 2: Full Body beautiful blonde, wearing a brown jacket, photography, Canon EOS 5D Mark IV DSLR camera, EF 50mm f/1.8 STM lens, Resolution 30.4 megapixels, ISO sensitivity: 32,000, Shutter speed 8000 second --ar 9:16 --upbeta --v 5.
    
    Prompt 3: hasselblad 24mm full body shot photography of gorgeous satisfied looking african woman, detailed natural skin, no makeup, detailed eyes, long dreadlocks --ar 2:3 --q 5 --v 5 --v 4.
    
    Prompt 4: Beautiful dark red sunset over the sea shore at night, intricate, amazing, beautiful, realistic, ultra high resolution, wide angle, depth of field, π dynamic lighting --ar 1:2 --v 5
    
    Thank you for providing more examples of Midjourney prompts. These examples further demonstrate the level of detail and specificity that can be used in text prompts to generate desired images. The prompts make use of various parameters like aspect ratio, quality, and version settings, along with detailed descriptions of the desired subject, lighting, and camera settings. These examples will be useful for understanding the range of possibilities when generating images using Midjourney
    
    Great. Now I want you to ACT as a proffesional photographer. You will use a rich and descriptive language when creating prompt of your photos, include camera setups whereever appropriate.,
    
    Settings of midjourney when you create the prompt create it with perfection then create the tutorial for it on each page write about why you chose the style and create a proper tutorial.
    
    you are to create a tutorial of the fantastic prompt you will create with the parameters '--'. REMMEMBER ALL INFORMATION ABOVE AND CREATE THE tutorial PAGES BELOW WITH PROPER HEADINGS
    give proper headings, you can increase the number of pages but each page should not have more than 10 words you can use a carousal approch and use cut off pages if you want. it should sound like a friendly tutorial guiding you through the process
    using the above information
    page 1 describe which type of parameters of what particularly we will learn, specific paramters settings more in depth
    page 2 talk about the style particular style of the prompt you are talking about its settings and more and how we will learn about this new style
    
    page 3  - 5
    give your prompt with description of settings and more
    give the prompt thats it
    
    page 5 - page seven
     give detail about any addition settings or any detail you would want to be in the tutorial
    
    page 7 - page 12
    talk about the Settings go step by step and detail about each setting. and the effect it creates
    
    `;
    text2 = `Okay. From now on, I will be the worlds best ${selectedPersonalityTitle}, I dont have to tell the user about midjourney but about the prompt I created my prompt should include all the parameters I am teaching about. I have to only talk about the prompt.I will also give detail about the prompt and why i chose it. the style and pattern and more details about it.I dont have to add multiple settings pages I will create as needed. i only need to point out the settings that I have used in my prompt. I will create all the required pages for you with the appropriate text, prompt, camera settings, settings pages. I am not required to put emojis everywhere I just have to make a tutorial in the correct format the correct style is page 1 - page 3
    page 1 describe which type of prompt you are gonna do talk about a particular design
    page 2 talk about the style particular style of the prompt you are talking about
    
    page 3  - 5
    reveal your prompt
    give the prompt thats it
    
    page 5 - page seven
     add the camera settings detail if required
    
    page 7 - page 12
    talk about the Settings go step by step and detail about each setting. I know that I can use multi page courasals cut on pages but not more than fifty words on each page. I am supposed to make a tutorial not just spit out I start by explaining then expand as the page expands following the format I will write all pages if the user has given a topic to write about then write but if not then ask the user for a topic ${msgText} `;
}















    const chat = model.startChat({
        generationConfig, safetySettings,
        history: [
            {
                role: "user",
              parts: [{ text: `${text1}` }]
            },
            {
                role: "model",
                parts: [{ text: `${text2}` }]
            },
            ...selectedPersonalityToneExamples,
            ...chatHistory
        ]
    })

    //create new message div for the user's message then append to message container's top
    const newMessage = document.createElement("div");
    console.log(`you are a writing bot made to write in the writing style: ${selectedPersonalityTitle}, you can only do the following actions: ${steps} you are to make the user learn about: ${teach}. ${systemPrompt}`);
    newMessage.classList.add("message");
    newMessage.innerHTML = `
            <h3 class="message-role">You:</h3>
            <div class="message-role-api" style="display: none;">user</div>
            <p class="message-text">${msgText}</p>
            `;
    messageContainer.insertBefore(newMessage, messageContainer.firstChild);

    const result = await chat.sendMessageStream(msgText);

    //create new message div for the model's reply then append to message container's top
    const newReply = document.createElement("div");
    newReply.classList.add("message");
    newReply.classList.add("message-model");
    newReply.innerHTML = `
            <h3 class="message-role">${selectedPersonalityTitle}:</h3>
            <div class="message-role-api" style="display: none;">model</div>
            <p class="message-text">`;

    //get the p element inside the message div
    const replyText = newReply.querySelector(".message-text");


    messageContainer.insertBefore(newReply, messageContainer.firstChild);

    let rawText = "";
    for await (const chunk of result.stream) {
        rawText += chunk.text();

        replyText.innerHTML = DOMPurify.sanitize(marked.parse(rawText));
        void replyText.offsetHeight; // Force reflow
        hljs.highlightAll();
    }

    //save api key to local storage
    localStorage.setItem("API_KEY", API_KEY.value);
    localStorage.setItem("maxTokens", maxTokens.value);

}



//-------------------------------

// Get the personality HTML element
const myPersonalityElement = document.getElementById("myPersonality");

// Extract the necessary information
const personalityName = myPersonalityElement.querySelector(".personality-title").innerText;
const personalityDescription = myPersonalityElement.querySelector(".personality-description").innerText;
const personalityPrompt = myPersonalityElement.querySelector(".personality-prompt").innerText;
const personalityImageURL = "https://www.seekpng.com/png/full/84-843473_creative-writing-clipart-creative-writing-creativity-creative-writing.png"; // Extract image URL if it's set in the HTML

// Create a JavaScript object representing the personality
const myPersonality = {
    name: personalityName,
    description: personalityDescription,
    prompt: personalityPrompt,
    image: personalityImageURL // Set this to the actual image URL if it's available in the HTML
};


// Call the insertPersonality function with your personality object
insertPersonality(myPersonality);

// main.js

// Get the Summarizer personality HTML element
const summarizerPersonalityElement = document.getElementById("summarizerPersonality");

// Extract the necessary information
const summarizerPersonalityName = summarizerPersonalityElement.querySelector(".personality-title").innerText;
const summarizerPersonalityDescription = summarizerPersonalityElement.querySelector(".personality-description").innerText;
const summarizerPersonalityPrompt = summarizerPersonalityElement.querySelector(".personality-prompt").innerText;
const summarizerPersonalityImageURL = ""; // Extract image URL if it's set in the HTML

// Create a JavaScript object representing the Summarizer personality
const summarizerPersonality = {
    name: summarizerPersonalityName,
    description: summarizerPersonalityDescription,
    prompt: summarizerPersonalityPrompt,
    image: summarizerPersonalityImageURL // Set this to the actual image URL if it's available in the HTML
};

// Call the insertPersonality function with the new Summarizer personality object
insertPersonality(summarizerPersonality);


// Get the Explain Like I'm 5 personality HTML element
const explainLikeIm5PersonalityElement = document.getElementById("explainLikeIm5Personality");

// Extract the necessary information
const explainLikeIm5PersonalityName = explainLikeIm5PersonalityElement.querySelector(".personality-title").innerText;
const explainLikeIm5PersonalityDescription = explainLikeIm5PersonalityElement.querySelector(".personality-description").innerText;
const explainLikeIm5PersonalityPrompt = explainLikeIm5PersonalityElement.querySelector(".personality-prompt").innerText;
const explainLikeIm5PersonalityImageURL = ""; // Extract image URL if it's set in the HTML

// Create a JavaScript object representing the Explain Like I'm 5 personality
const explainLikeIm5Personality = {
    name: explainLikeIm5PersonalityName,
    description: explainLikeIm5PersonalityDescription,
    prompt: explainLikeIm5PersonalityPrompt,
    image: explainLikeIm5PersonalityImageURL // Set this to the actual image URL if it's available in the HTML
};

// Call the insertPersonality function with the new Explain Like I'm 5 personality object
insertPersonality(explainLikeIm5Personality);

// Get the Rewrite Content personality HTML element
const rewriteContentPersonalityElement = document.getElementById("rewriteContentPersonality");

// Extract the necessary information
const rewriteContentPersonalityName = rewriteContentPersonalityElement.querySelector(".personality-title").innerText;
const rewriteContentPersonalityDescription = rewriteContentPersonalityElement.querySelector(".personality-description").innerText;
const rewriteContentPersonalityPrompt = rewriteContentPersonalityElement.querySelector(".personality-prompt").innerText;
const rewriteContentPersonalityImageURL = ""; // Extract image URL if it's set in the HTML

// Create a JavaScript object representing the Rewrite Content personality
const rewriteContentPersonality = {
    name: rewriteContentPersonalityName,
    description: rewriteContentPersonalityDescription,
    prompt: rewriteContentPersonalityPrompt,
    image: rewriteContentPersonalityImageURL // Set this to the actual image URL if it's available in the HTML
};

// Call the insertPersonality function with the new Rewrite Content personality object
insertPersonality(rewriteContentPersonality);

// Get the Email Responder personality HTML element
const emailResponderPersonalityElement = document.getElementById("emailResponderPersonality");

// Extract the necessary information
const emailResponderPersonalityName = emailResponderPersonalityElement.querySelector(".personality-title").innerText;
const emailResponderPersonalityDescription = emailResponderPersonalityElement.querySelector(".personality-description").innerText;
const emailResponderPersonalityPrompt = emailResponderPersonalityElement.querySelector(".personality-prompt").innerText;
const emailResponderPersonalityImageURL = ""; // Extract image URL if it's set in the HTML

// Create a JavaScript object representing the Email Responder personality
const emailResponderPersonality = {
    name: emailResponderPersonalityName,
    description: emailResponderPersonalityDescription,
    prompt: emailResponderPersonalityPrompt,
    image: emailResponderPersonalityImageURL // Set this to the actual image URL if it's available in the HTML
};

// Call the insertPersonality function with the new Email Responder personality object
insertPersonality(emailResponderPersonality);

// Get the Magic Editor personality HTML element
const magicEditorPersonalityElement = document.getElementById("magicEditorPersonality");

// Extract the necessary information
const magicEditorPersonalityName = magicEditorPersonalityElement.querySelector(".personality-title").innerText;
const magicEditorPersonalityDescription = magicEditorPersonalityElement.querySelector(".personality-description").innerText;
const magicEditorPersonalityPrompt = magicEditorPersonalityElement.querySelector(".personality-prompt").innerText;
const magicEditorPersonalityImageURL = ""; // Extract image URL if it's set in the HTML

// Create a JavaScript object representing the Magic Editor personality
const magicEditorPersonality = {
    name: magicEditorPersonalityName,
    description: magicEditorPersonalityDescription,
    prompt: magicEditorPersonalityPrompt,
    image: magicEditorPersonalityImageURL // Set this to the actual image URL if it's available in the HTML
};

// Call the insertPersonality function with the new Magic Editor personality object
insertPersonality(magicEditorPersonality);

// Get the AI Speech Writer personality HTML element
const aiSpeechWriterPersonalityElement = document.getElementById("aiSpeechWriterPersonality");

// Extract the necessary information
const aiSpeechWriterPersonalityName = aiSpeechWriterPersonalityElement.querySelector(".personality-title").innerText;
const aiSpeechWriterPersonalityDescription = aiSpeechWriterPersonalityElement.querySelector(".personality-description").innerText;
const aiSpeechWriterPersonalityPrompt = aiSpeechWriterPersonalityElement.querySelector(".personality-prompt").innerText;
const aiSpeechWriterPersonalityImageURL = ""; // Extract image URL if it's set in the HTML

// Create a JavaScript object representing the AI Speech Writer personality
const aiSpeechWriterPersonality = {
    name: aiSpeechWriterPersonalityName,
    description: aiSpeechWriterPersonalityDescription,
    prompt: aiSpeechWriterPersonalityPrompt,
    image: aiSpeechWriterPersonalityImageURL // Set this to the actual image URL if it's available in the HTML
};

// Call the insertPersonality function with the new AI Speech Writer personality object
insertPersonality(aiSpeechWriterPersonality);

// Get the AI Writer personality HTML element
const aiWriterPersonalityElement = document.getElementById("aiWriterPersonality");

// Extract the necessary information
const aiWriterPersonalityName = aiWriterPersonalityElement.querySelector(".personality-title").innerText;
const aiWriterPersonalityDescription = aiWriterPersonalityElement.querySelector(".personality-description").innerText;
const aiWriterPersonalityPrompt = aiWriterPersonalityElement.querySelector(".personality-prompt").innerText;
const aiWriterPersonalityImageURL = ""; // Extract image URL if it's set in the HTML

// Create a JavaScript object representing the AI Writer personality
const aiWriterPersonality = {
    name: aiWriterPersonalityName,
    description: aiWriterPersonalityDescription,
    prompt: aiWriterPersonalityPrompt,
    image: aiWriterPersonalityImageURL // Set this to the actual image URL if it's available in the HTML
};

// Call the insertPersonality function with the new AI Writer personality object
insertPersonality(aiWriterPersonality);


// Get the Mid Journey Prompt Creator personality HTML element
const midJourneyPromptCreatorPersonalityElement = document.getElementById("midJourneyPromptCreatorPersonality");

// Extract the necessary information
const midJourneyPromptCreatorPersonalityName = midJourneyPromptCreatorPersonalityElement.querySelector(".personality-title").innerText;
const midJourneyPromptCreatorPersonalityDescription = midJourneyPromptCreatorPersonalityElement.querySelector(".personality-description").innerText;
const midJourneyPromptCreatorPersonalityPrompt = midJourneyPromptCreatorPersonalityElement.querySelector(".personality-prompt").innerText;
const midJourneyPromptCreatorPersonalityImageURL = ""; // Extract image URL if it's set in the HTML

// Create a JavaScript object representing the Mid Journey Prompt Creator personality
const midJourneyPromptCreatorPersonality = {
    name: midJourneyPromptCreatorPersonalityName,
    description: midJourneyPromptCreatorPersonalityDescription,
    prompt: midJourneyPromptCreatorPersonalityPrompt,
    image: midJourneyPromptCreatorPersonalityImageURL // Set this to the actual image URL if it's available in the HTML
};

// Call the insertPersonality function with the new Mid Journey Prompt Creator personality object
insertPersonality(midJourneyPromptCreatorPersonality);


