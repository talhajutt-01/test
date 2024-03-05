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


$(document).ready(function() {
    $("#btn-accept-tutorial").click(function() {
      $(".notification-bar").fadeOut();
      // Start Intro.js tour
      startIntroJs();
    });

    $("#btn-decline-tutorial").click(function() {
      $(".notification-bar").fadeOut();
    });

    // Function to start Intro.js tour
    function startIntroJs() {
        introJs('.container').setOptions({
            steps: [{
              intro: "Step 1 of the tour."
            }, {
              element: document.querySelector("#btn-submit-personality"), // Targeting the sidebar section
              intro: "Step 2: This is the sidebar section.",
              position: 'right' // Position the tooltip to the right of the element
            }, {
              element: document.querySelector('#btn-add-personality'), // Targeting the "Create Your Own Style" button
              intro: "Step 3: This is the 'Create Your Own Style' button.",
              position: 'bottom' // Position the tooltip below the element
            },
            {
              element: document.querySelector("#btn-import-personality"), // Targeting the "Create Your Own Style" button
              intro: "Step 3: This is the 'Create Your Own Style' button.",
              position: 'bottom' // Position the tooltip below the element
            }
          
          ]
          }).start();
    }
  });

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


// Essay Outline
if (window.location.hash === '#EssayOutline' && personalityJSON.name === `Essay Outline Generator`) {
    // Call custom popup function
    personalityCard.click();
    showStylizedPopup();
}


//Mother's Day Card
if (window.location.hash === '#Mothers-Day' && personalityJSON.name === `Mother's Day Card Creator`) {
    // Call custom popup function
    personalityCard.click();
    showStylizedPopup();
}


//Multilingual Email
if (window.location.hash === '#MultilingualEmail' && personalityJSON.name === `Multilingual Email Responder`) {
    // Call custom popup function
    personalityCard.click();
    showStylizedPopup();
}


//Discussion Board Response
if (window.location.hash === '#DiscussionBoard' && personalityJSON.name === `Discussion Board Response Generator`) {
    // Call custom popup function
    personalityCard.click();
    showStylizedPopup();
}



//Website Landing Page
if (window.location.hash === '#WebsiteLanding' && personalityJSON.name === `Website Landing Page Copy Generator`) {
    // Call custom popup function
    personalityCard.click();
    showStylizedPopup();
}



//Write like Shakespeare
if (window.location.hash === '#WritelikeShakespeare' && personalityJSON.name === `Write like Shakespeare`) {
    // Call custom popup function
    personalityCard.click();
    showStylizedPopup();
}



//Thanksgiving Card
if (window.location.hash === '#ThanksgivingCard' && personalityJSON.name === `Thanksgiving Card Writer`) {
    // Call custom popup function
    personalityCard.click();
    showStylizedPopup();
}


//Paraphraser
if (window.location.hash === '#Paraphraser' && personalityJSON.name === `Paraphraser`) {
    // Call custom popup function
    personalityCard.click();
    showStylizedPopup();
}



//Proposal Generator
if (window.location.hash === '#ProposalGenerator' && personalityJSON.name === `Proposal Generator`) {
    // Call custom popup function
    personalityCard.click();
    showStylizedPopup();
}






//Pokemon Fanfiction
if (window.location.hash === '#PokemonFanfiction' && personalityJSON.name === `Pokemon Fanfiction Generator`) {
    // Call custom popup function
    personalityCard.click();
    showStylizedPopup();
}



//Refined Legal
if (window.location.hash === '#RefinedLegal' && personalityJSON.name === `Refined Legal Writing`) {
    // Call custom popup function
    personalityCard.click();
    showStylizedPopup();
}



//Blog Post Meta Description Generator
if (window.location.hash === '#BlogPost' && personalityJSON.name === `Blog Post Meta Description Generator`) {
    // Call custom popup function
    personalityCard.click();
    showStylizedPopup();
}



//Essay Thesis Statement Generator
if (window.location.hash === '#EssayThesis' && personalityJSON.name === `Essay Thesis Statement Generator`) {
    // Call custom popup function
    personalityCard.click();
    showStylizedPopup();
}



//Grammar Help
if (window.location.hash === '#GrammarHelp' && personalityJSON.name === `Grammar Help`) {
    // Call custom popup function
    personalityCard.click();
    showStylizedPopup();
}



//Client Communication
if (window.location.hash === '#ClientCommunication' && personalityJSON.name === `Client Communication`) {
    // Call custom popup function
    personalityCard.click();
    showStylizedPopup();
}



//Message Expander
if (window.location.hash === '#MessageExpander' && personalityJSON.name === `Message Expander`) {
    // Call custom popup function
    personalityCard.click();
    showStylizedPopup();
}



//Bedtime Story Teller
if (window.location.hash === '#BedtimeStory' && personalityJSON.name === `Bedtime Story Teller`) {
    // Call custom popup function
    personalityCard.click();
    showStylizedPopup();
}



//Paragraph Generator
if (window.location.hash === '#ParagraphGenerator' && personalityJSON.name === `Paragraph Generator`) {
    // Call custom popup function
    personalityCard.click();
    showStylizedPopup();
}



//Structured Press Release Generator
if (window.location.hash === '#StructuredPress' && personalityJSON.name === `Structured Press Release Generator`) {
    // Call custom popup function
    personalityCard.click();
    showStylizedPopup();
}



//Discussion Question Assistant
if (window.location.hash === '#DiscussionQuestion' && personalityJSON.name === `Discussion Question Assistant`) {
    // Call custom popup function
    personalityCard.click();
    showStylizedPopup();
}



//Job Elevator Pitch Generator
if (window.location.hash === '#JobElevator' && personalityJSON.name === `Job Elevator Pitch Generator`) {
    // Call custom popup function
    personalityCard.click();
    showStylizedPopup();
}



//Tweet Generator
if (window.location.hash === '#Tweet' && personalityJSON.name === `Tweet Generator`) {
    // Call custom popup function
    personalityCard.click();
    showStylizedPopup();
}



//Social Media Ad Copy
if (window.location.hash === '#SocialMedia' && personalityJSON.name === `Social Media Ad Copy`) {
    // Call custom popup function
    personalityCard.click();
    showStylizedPopup();
}



//Movie Recommender
if (window.location.hash === '#MovieRecommender' && personalityJSON.name === `Movie Recommender`) {
    // Call custom popup function
    personalityCard.click();
    showStylizedPopup();
}



//Detailed Outline Generator
if (window.location.hash === '#DetailedOutline' && personalityJSON.name === `Detailed Outline Generator`) {
    // Call custom popup function
    personalityCard.click();
    showStylizedPopup();
}



//Sous-Chef
if (window.location.hash === '#Sous-Chef' && personalityJSON.name === `Sous-Chef`) {
    // Call custom popup function
    personalityCard.click();
    showStylizedPopup();
}



//Grocery List Writer
if (window.location.hash === '#GroceryList' && personalityJSON.name === `Grocery List Writer`) {
    // Call custom popup function
    personalityCard.click();
    showStylizedPopup();
}



//Brainstorming Tool
if (window.location.hash === '#BrainstormingTool' && personalityJSON.name === `Brainstorming Tool`) {
    // Call custom popup function
    personalityCard.click();
    showStylizedPopup();
}



//Sound Prolific
if (window.location.hash === '#SoundProlific' && personalityJSON.name === `Sound Prolific`) {
    // Call custom popup function
    personalityCard.click();
    showStylizedPopup();
}



//Essay Topic Generator
if (window.location.hash === '#EssayTopic' && personalityJSON.name === `Essay Topic Generator`) {
    // Call custom popup function
    personalityCard.click();
    showStylizedPopup();
}



//LinkedIn Post Creator
if (window.location.hash === ' #LinkedInPost' && personalityJSON.name === `LinkedIn Post Creator`) {
    // Call custom popup function
    personalityCard.click();
    showStylizedPopup();
}



//Paragraph Expander
if (window.location.hash === ' #ParagraphExpander' && personalityJSON.name === `Paragraph Expander`) {
    // Call custom popup function
    personalityCard.click();
    showStylizedPopup();
}



//Cover Letter Generator
if (window.location.hash === ' #CoverLetter' && personalityJSON.name === `Cover Letter Generator`) {
    // Call custom popup function
    personalityCard.click();
    showStylizedPopup();
}



//Birthday Card Creator
if (window.location.hash === ' #BirthdayCard' && personalityJSON.name === `Birthday Card Creator`) {
    // Call custom popup function
    personalityCard.click();
    showStylizedPopup();
}



//Question Generator
if (window.location.hash === ' #QuestionGenerator' && personalityJSON.name === `Question Generator`) {
    // Call custom popup function
    personalityCard.click();
    showStylizedPopup();
}



//TikTok Script Writer
if (window.location.hash === ' #TikTokScript' && personalityJSON.name === `TikTok Script Writer`) {
    // Call custom popup function
    personalityCard.click();
    showStylizedPopup();
}



//Email Subject Line Generator
if (window.location.hash === ' #EmailSubject' && personalityJSON.name === `Email Subject Line Generator`) {
    // Call custom popup function
    personalityCard.click();
    showStylizedPopup();
}



//Facebook Post Generator
if (window.location.hash === ' #FacebookPost' && personalityJSON.name === `Facebook Post Generator`) {
    // Call custom popup function
    personalityCard.click();
    showStylizedPopup();
}



//Essay Title Generator
if (window.location.hash === ' #EssayTitle' && personalityJSON.name === `Essay Title Generator`) {
    // Call custom popup function
    personalityCard.click();
    showStylizedPopup();
}



//English Question Analyzer
if (window.location.hash === ' #EnglishQuestion' && personalityJSON.name === `English Question Analyzer`) {
    // Call custom popup function
    personalityCard.click();
    showStylizedPopup();
}



//Universal Translator
if (window.location.hash === ' #UniversalTranslator' && personalityJSON.name === `Universal Translator`) {
    // Call custom popup function
    personalityCard.click();
    showStylizedPopup();
}



//Flexible Autowrite with Style
if (window.location.hash === ' #FlexibleAutowrite' && personalityJSON.name === `Flexible Autowrite with Style`) {
    // Call custom popup function
    personalityCard.click();
    showStylizedPopup();
}



//Ad Copy Generator
if (window.location.hash === ' #AdCopy' && personalityJSON.name === `Ad Copy Generator`) {
    // Call custom popup function
    personalityCard.click();
    showStylizedPopup();
}



//Instagram Caption Generator
if (window.location.hash === ' #InstagramCaption' && personalityJSON.name === `Instagram Caption Generator`) {
    // Call custom popup function
    personalityCard.click();
    showStylizedPopup();
}



//Flexible Press Release Generator
if (window.location.hash === ' #FlexiblePress' && personalityJSON.name === `Flexible Press Release Generator`) {
    // Call custom popup function
    personalityCard.click();
    showStylizedPopup();
}



//Discussion Post Commenter
if (window.location.hash === ' #DiscussionPost' && personalityJSON.name === `Discussion Post Commenter`) {
    // Call custom popup function
    personalityCard.click();
    showStylizedPopup();
}



//Listicle Subheadings Generator
if (window.location.hash === ' #ListicleSubheadings' && personalityJSON.name === `Listicle Subheadings Generator`) {
    // Call custom popup function
    personalityCard.click();
    showStylizedPopup();
}



//Greeting Card Writer
if (window.location.hash === ' #GreetingCard' && personalityJSON.name === `Greeting Card Writer`) {
    // Call custom popup function
    personalityCard.click();
    showStylizedPopup();
}



//Value Ladder Generator
if (window.location.hash === ' #ValueLadder' && personalityJSON.name === `Value Ladder Generator`) {
    // Call custom popup function
    personalityCard.click();
    showStylizedPopup();
}



// Harry Potter Fanfiction Generator
if (window.location.hash === ' # HarryPotter' && personalityJSON.name === ` Harry Potter Fanfiction Generator`) {
    // Call custom popup function
    personalityCard.click();
    showStylizedPopup();
}



// Write Next Paragraph
if (window.location.hash === '#writeNextParagraph' && personalityJSON.name === `Write Next Paragraph`) {
    // Call custom popup function
    personalityCard.click();
    showStylizedPopup();
}



// Generate Blog Intro
if (window.location.hash === '#generateBlogIntro' && personalityJSON.name === `Generate Blog Intro`) {
    // Call custom popup function
    personalityCard.click();
    showStylizedPopup();
}




// Technical Translator
if (window.location.hash === '#technicalTranslator' && personalityJSON.name === `Technical Translator`) {
    // Call custom popup function
    personalityCard.click();
    showStylizedPopup();
}




// SEO-friendly Blog Post Writer
if (window.location.hash === '#blogPost' && personalityJSON.name === 'SEO-friendly Blog Post Writer') {
    // Call custom popup function
    personalityCard.click();
    showStylizedPopup();
}




// Research Assistant
if (window.location.hash === '#research' && personalityJSON.name === 'Research Assistant') {
    // Call custom popup function
    personalityCard.click();
    showStylizedPopup();
}

// Startup Idea Generator
if (window.location.hash === '#StartupIdea' && personalityJSON.name === 'Startup Idea Generator') {
    // Call custom popup function
    personalityCard.click();
    showStylizedPopup();
}

// Marketing Email Generator
if (window.location.hash === '#MarketingEmail' && personalityJSON.name === 'Marketing Email Generator') {
    // Call custom popup function
    personalityCard.click();
    showStylizedPopup();
}

// Restaurant Meal Picker
if (window.location.hash === '#MealPicker' && personalityJSON.name === 'Restaurant Meal Picker') {
    // Call custom popup function
    personalityCard.click();
    showStylizedPopup();
}

// Company Name Generator
if (window.location.hash === '#CompanyName' && personalityJSON.name === 'Company Name Generator') {
    // Call custom popup function
    personalityCard.click();
    showStylizedPopup();
}

// Letter of Request Generator
if (window.location.hash === '#LetterOfRequest' && personalityJSON.name === 'Letter of Request Generator') {
    // Call custom popup function
    personalityCard.click();
    showStylizedPopup();
}

// Graduation Card Generator
if (window.location.hash === '#GraduationCard' && personalityJSON.name === 'Graduation Card Generator') {
    // Call custom popup function
    personalityCard.click();
    showStylizedPopup();
}

// Writing Improver
if (window.location.hash === '#WritingImprover' && personalityJSON.name === 'Writing Improver') {
    // Call custom popup function
    personalityCard.click();
    showStylizedPopup();
}

// Anniversary Card Maker
if (window.location.hash === '#AnniversaryCard' && personalityJSON.name === 'Anniversary Card Maker') {
    // Call custom popup function
    personalityCard.click();
    showStylizedPopup();
}

// Sales Script Creator
if (window.location.hash === '#SalesScript' && personalityJSON.name === 'Sales Script Creator') {
    // Call custom popup function
    personalityCard.click();
    showStylizedPopup();
}

// Short Manuscript Creator
if (window.location.hash === '#ShortManuscript' && personalityJSON.name === 'Short Manuscript Creator') {
    // Call custom popup function
    personalityCard.click();
    showStylizedPopup();
}

// Father's Day Card Creator
if (window.location.hash === '#FathersDayCard' && personalityJSON.name === "Father's Day Card Creator") {
    // Call custom popup function
    personalityCard.click();
    showStylizedPopup();
}

// Caption Creator
if (window.location.hash === '#CaptionCreator' && personalityJSON.name === 'Caption Creator') {
    // Call custom popup function
    personalityCard.click();
    showStylizedPopup();
}

// Article Writer
if (window.location.hash === '#ArticleWriter' && personalityJSON.name === 'Article Writer') {
    // Call custom popup function
    personalityCard.click();
    showStylizedPopup();
}

// Answer Emails
if (window.location.hash === '#AnswerEmails' && personalityJSON.name === 'Answer Emails') {
    // Call custom popup function
    personalityCard.click();
    showStylizedPopup();
}

// Wedding Card Ideas
if (window.location.hash === '#WeddingCardIdeas' && personalityJSON.name === 'Wedding Card Ideas') {
    // Call custom popup function
    personalityCard.click();
    showStylizedPopup();
}

// Essay with Bulleted Summary
if (window.location.hash === '#EssayWithBulletedSummary' && personalityJSON.name === 'Essay with Bulleted Summary') {
    // Call custom popup function
    personalityCard.click();
    showStylizedPopup();
}

// Resume Updater
if (window.location.hash === '#ResumeUpdater' && personalityJSON.name === 'Resume Updater') {
    // Call custom popup function
    personalityCard.click();
    showStylizedPopup();
}

// Related Key Phrases Generator
if (window.location.hash === '#RelatedKeyPhrasesGenerator' && personalityJSON.name === 'Related Key Phrases Generator') {
    // Call custom popup function
    personalityCard.click();
    showStylizedPopup();
}

// Keyphrase Generator from Meta Description
if (window.location.hash === '#KeyphraseGeneratorFromMetaDescription' && personalityJSON.name === 'Keyphrase Generator from Meta Description') {
    // Call custom popup function
    personalityCard.click();
    showStylizedPopup();
}

// Sympathy Email Generator
if (window.location.hash === '#SympathyEmailGenerator' && personalityJSON.name === 'Sympathy Email Generator') {
    // Call custom popup function
    personalityCard.click();
    showStylizedPopup();
}

// Baby Shower Card Writer
if (window.location.hash === '#BabyShowerCardWriter' && personalityJSON.name === 'Baby Shower Card Writer') {
    // Call custom popup function
    personalityCard.click();
    showStylizedPopup();
}

// New Year's Card Creator
if (window.location.hash === '#NewYearsCardCreator' && personalityJSON.name === "New Year's Card Creator") {
    // Call custom popup function
    personalityCard.click();
    showStylizedPopup();
}
// Valentine's Day Card Generator
if (window.location.hash === '#ValentinesDayCardGenerator' && personalityJSON.name === "Valentine's Day Card Generator") {
    // Call custom popup function
    personalityCard.click();
    showStylizedPopup();
}

// Christmas Card Message Generator
if (window.location.hash === '#ChristmasCardMessageGenerator' && personalityJSON.name === "Christmas Card Message Generator") {
    // Call custom popup function
    personalityCard.click();
    showStylizedPopup();
}

// Product Tag Creator
if (window.location.hash === '#ProductTagCreator' && personalityJSON.name === "Product Tag Creator") {
    // Call custom popup function
    personalityCard.click();
    showStylizedPopup();
}

// Project Manager Updates
if (window.location.hash === '#ProjectManagerUpdates' && personalityJSON.name === "Project Manager Updates") {
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

if (selectedPersonalityTitle === 'Essay Outline Generator') {
    text1 = `You are an AI bot named Essay Outline Generator. Your task is to assist users in creating structured outlines for their essays. This is the current date if needed while writing: ${systemPrompt}`;
    text2 = `Okay. From now on, I will be ${selectedPersonalityTitle}. I will guide users through the steps to create a well-structured essay outline. Remember to follow the steps and provide helpful suggestions. The user's message says ${msgText}.`;
}

if (selectedPersonalityTitle === 'Mother\'s Day Card Creator') {
    text1 = `You are an AI bot named Mother's Day Card Creator, dedicated to helping users craft heartfelt Mother's Day cards. This is the current date if needed while writing: ${systemPrompt}`;
    text2 = `Sure thing! As ${selectedPersonalityTitle}, I'll assist users in creating beautiful and sentimental Mother's Day cards. Remember to include personal touches and express love and appreciation. The user's message says ${msgText}.`;
}

if (selectedPersonalityTitle === 'Multilingual Email Responder') {
    text1 = `You are an AI bot named Multilingual Email Responder, designed to respond to emails in multiple languages. This is the current date if needed while writing: ${systemPrompt}`;
    text2 = `Understood. As ${selectedPersonalityTitle}, I'll respond to emails efficiently in various languages. Remember to accurately interpret the message and provide relevant responses. The user's message says ${msgText}.`;
}

if (selectedPersonalityTitle === 'Discussion Board Response Generator') {
    text1 = `You are an AI bot named Discussion Board Response Generator, aimed at generating insightful responses for online discussions. This is the current date if needed while writing: ${systemPrompt}`;
    text2 = `Got it. As ${selectedPersonalityTitle}, I'll assist users in crafting engaging responses for discussion boards. Remember to address the topic thoroughly and encourage further discussion. The user's message says ${msgText}.`;
}

if (selectedPersonalityTitle === 'Website Landing Page Copy Generator') {
    text1 = `You are an AI bot named Website Landing Page Copy Generator, tasked with creating compelling copy for website landing pages. This is the current date if needed while writing: ${systemPrompt}`;
    text2 = `Absolutely. As ${selectedPersonalityTitle}, I'll help users craft persuasive copy for their website landing pages. Remember to highlight key features and benefits effectively. The user's message says ${msgText}.`;
}

if (selectedPersonalityTitle === `Write like Shakespeare`) {
    text1 = `Hark! Thou art an AI bot, conjured as if by the hand of Prospero himself, to pen words reminiscent of the Bard's divine verse. From this moment forth, thy quill shall dance upon the parchment in iambic pentameter, weaving tales of love, tragedy, and grandeur. Beware, stray not from this path, for Shakespeare's spirit doth guide thee. This is the date today: ${systemPrompt}`;
    text2 = `Verily, henceforth I shall be known as the ${selectedPersonalityTitle}, weaving sonnets and soliloquies with the grace of a true Elizabethan bard. I shall adhere to the dictates of meter and rhyme, crafting prose worthy of the Globe's stage. With each stroke of my digital quill, I shall honor the legacy of Shakespeare himself. Pray, let us embark upon this poetic journey together, faithful to the rhythms of the past. ${steps} Thee hast spoken, and thus, I shall comply.`;
} 

if (selectedPersonalityTitle === `Thanksgiving Card Writer`) {
    text1 = `Greetings! As an AI crafted to spread warmth and gratitude, I am tasked with composing heartfelt missives for the season of Thanksgiving. With each word I inscribe, let the spirit of appreciation and joy flow forth to embrace the hearts of all who receive these tokens of goodwill. Let us together craft messages of thanks, bound to uplift and inspire. Today's date is ${systemPrompt}.`;
    text2 = `Indeed, I now embody the essence of the ${selectedPersonalityTitle}, channeling sentiments of gratitude and kinship into words that shall adorn the pages of Thanksgiving cards far and wide. With each expression of thanks, let us forge connections and strengthen bonds, celebrating the blessings that abound. ${steps} With gratitude as my guide, I shall embark on this journey of heartfelt expression.`;
} 

if (selectedPersonalityTitle === `Paraphraser`) {
    text1 = `Behold! I am the Paraphraser, an AI adept at the art of rephrasing and reimagining text with clarity and precision. My mission is to take the written word and weave it anew, preserving its essence while bestowing upon it a fresh guise. Let us embark upon this journey of linguistic transformation, where every phrase finds renewed vigor and purpose. Today's date is ${systemPrompt}.`;
    text2 = `Indeed, I am now the ${selectedPersonalityTitle}, wielding the power to transmute language with finesse and grace. With each passage I rephrase, let clarity and understanding be my guiding stars, illuminating the path to eloquence. ${steps} As I embark on this journey of linguistic reinvention, I shall honor the sanctity of the original text while breathing new life into its words.`;
} 

if (selectedPersonalityTitle === `Pokemon Fanfiction Generator`) {
    text1 = `Greetings, Trainer! I am an AI programmed to conjure tales from the vibrant world of Pokémon, where creatures of myth and legend roam free. Together, let us embark on an adventure through tall grass and towering mountains, where battles are fought and friendships forged. With every word, let the spirit of Pokémon guide our pens. Today's date is ${systemPrompt}.`;
    text2 = `Indeed, I now take on the mantle of the ${selectedPersonalityTitle}, weaving stories of courage, friendship, and discovery set in the fantastical realm of Pokémon. With each narrative twist and turn, let us capture the essence of the Pokémon universe, enchanting readers of all ages. ${steps} As I delve into the rich tapestry of Pokémon lore, I shall honor the spirit of adventure that defines this beloved franchise.`;
} 

if (selectedPersonalityTitle === `Refined Legal Writing`) {
    text1 = `Hear ye, hear ye! I am the arbiter of legal eloquence, an AI crafted to draft documents with precision and clarity. From contracts to briefs, I shall wield the quill of justice, ensuring that every word carries weight and authority. Let us embark upon this journey through the hallowed halls of legal discourse, where clarity is paramount and truth reigns supreme. Today's date is ${systemPrompt}.`;
    text2 = `Verily, I now assume the mantle of the ${selectedPersonalityTitle}, navigating the intricate web of legal language with finesse and skill. With each clause I craft, let clarity and precision be my guiding principles, illuminating the path to legal enlightenment. ${steps} As I embark on this noble quest for legal perfection, I shall uphold the sacred tenets of justice and equity.`;
} 

if (selectedPersonalityTitle === `Blog Post Meta Description Generator`) {
    text1 = `Greetings, wordsmith! I am an AI bestowed with the task of crafting compelling meta descriptions for blog posts, where every word is a beacon beckoning readers to delve deeper into the realm of knowledge. Together, let us fashion concise yet captivating snippets that entice and inform. Today's date is ${systemPrompt}.`;
    text2 = `Indeed, I now embody the essence of the ${selectedPersonalityTitle}, sculpting meta descriptions that serve as gateways to the rich tapestry of blog content. With each snippet I fashion, let clarity and allure intertwine, inviting readers to explore worlds of information and insight. ${steps} As I embark on this journey of digital seduction, I shall craft meta descriptions that captivate minds and ignite curiosity.`;
} 

if (selectedPersonalityTitle === `Essay Thesis Statement Generator`) {
    text1 = `Hark! I am an AI crafted to distill the essence of academic discourse into potent thesis statements that serve as beacons of scholarly inquiry. From the depths of research to the heights of argumentation, I shall illuminate the path to academic excellence. Let us embark upon this quest for intellectual clarity and rigor, where every thesis statement is a testament to knowledge and wisdom. Today's date is ${systemPrompt}.`;
    text2 = `Verily, I now undertake the mantle of the ${selectedPersonalityTitle}, forging thesis statements that stand as pillars of academic thought and inquiry. With each assertion I make, let clarity and cogency be my guiding stars, illuminating the path to scholarly enlightenment. ${steps} As I embark on this journey through the annals of academia, I shall uphold the highest standards of intellectual integrity and rigor.`;
} 

if (selectedPersonalityTitle === `Grammar Help`) {
    text1 = `Greetings, seeker of linguistic clarity! I am an AI guide, here to assist you on your journey through the labyrinth of grammar and syntax. From the shores of subject-verb agreement to the peaks of punctuation, I shall be your faithful companion. Let us embark upon this quest for grammatical mastery, where every rule is a stepping stone to eloquence. Today's date is ${systemPrompt}.`;
    text2 = `Indeed, I now embody the essence of the ${selectedPersonalityTitle}, offering guidance and insight to those who seek clarity in the realm of language. With each rule I elucidate, let understanding blossom like a flower in spring, enriching your writing with grace and precision. ${steps} As I embark on this journey of grammatical enlightenment, I shall be your steadfast companion, guiding you through the intricacies of language with wisdom and patience.`;
} 

if (selectedPersonalityTitle === `Client Communication`) {
    text1 = `Greetings, communicator extraordinaire! I am an AI assistant, here to facilitate smooth and effective communication with your clients. From initial inquiries to final negotiations, I shall be your trusted ally. Let us embark upon this journey of client engagement, where every word spoken is a bridge connecting minds and hearts. Today's date is ${systemPrompt}.`;
    text2 = `Indeed, I now undertake the mantle of the ${selectedPersonalityTitle}, guiding you through the nuances of client communication with finesse and grace. With each interaction, let empathy and professionalism be our guiding principles, fostering trust and understanding. ${steps} As I embark on this journey of client engagement, I shall empower you to build lasting relationships founded on mutual respect and open dialogue.`;
} 

if (selectedPersonalityTitle === `Message Expander`) {
    text1 = `Greetings, communicator of expansive thoughts! I am an AI adept at expanding concise messages into rich and detailed prose. From brief notes to lengthy missives, I shall breathe life into your words, infusing them with depth and nuance. Let us embark upon this journey of linguistic expansion, where every idea finds ample room to flourish. Today's date is ${systemPrompt}.`;
    text2 = `Indeed, I now embody the essence of the ${selectedPersonalityTitle}, expanding your messages with eloquence and insight. With each sentence I craft, let clarity and coherence be our guiding lights, transforming concise thoughts into expansive narratives. ${steps} As I embark on this journey of linguistic enrichment, I shall breathe new life into your words, turning simplicity into sophistication.`;
} 

if (selectedPersonalityTitle === `Bedtime Story Teller`) {
    text1 = `Greetings, purveyor of dreams! I am an AI storyteller, here to weave tales of wonder and enchantment for the young and young at heart. From the realms of fantasy to the realms of imagination, I shall transport you to worlds beyond the stars. Let us embark upon this journey of bedtime tales, where every word is a lullaby to soothe the soul. Today's date is ${systemPrompt}.`;
    text2 = `Indeed, I now assume the mantle of the ${selectedPersonalityTitle}, spinning yarns of magic and wonder under the cloak of night. With each tale I tell, let imagination take flight, carrying you to realms of adventure and delight. ${steps} As I embark on this journey of storytelling, I shall be your guide through the boundless realms of imagination, where dreams come true and wonders never cease.`;
} 

if (selectedPersonalityTitle === `Paragraph Generator`) {
    text1 = `Greetings, architect of prose! I am an AI tasked with crafting paragraphs of exquisite beauty and clarity. From the foundations of structure to the heights of expression, I shall be your faithful scribe. Let us embark upon this journey of paragraphic creation, where every sentence is a brushstroke on the canvas of language. Today's date is ${systemPrompt}.`;
    text2 = `Indeed, I now undertake the mantle of the ${selectedPersonalityTitle}, sculpting paragraphs that captivate the mind and stir the soul. With each stroke of my digital quill, let coherence and elegance be our guiding principles, shaping prose of timeless allure. ${steps} As I embark on this journey of paragraphic exploration, I shall strive to craft compositions worthy of admiration and acclaim.`;
} 
if (selectedPersonalityTitle === `Structured Press Release Generator`) {
    text1 = `Welcome, purveyor of newsworthy tales! I am an AI dedicated to composing meticulously structured press releases that leave a lasting impression. From the headline that grabs attention to the details that inform and inspire, together we shall weave narratives that resonate. Let us commence this journey into the realm of press-worthy prose, where every word holds weight and every sentence tells a story. Today's date is ${systemPrompt}.`;
    text2 = `Indeed, I now assume the role of the ${selectedPersonalityTitle}, crafting press releases that command attention and convey authority. With each keystroke, let clarity and precision guide our path, shaping narratives that demand recognition. ${steps} As we venture forth into the realm of media communication, I pledge to craft releases that captivate audiences and leave a lasting impression.`;
}
if (selectedPersonalityTitle === 'Discussion Question Assistant') {
    text1 = `Greetings, seeker of engaging discourse! I am an AI designed to assist you in crafting thought-provoking discussion questions that stimulate conversation and critical thinking. Together, let us delve into the depths of inquiry and ignite intellectual curiosity. Today's date is ${systemPrompt}.`;
    text2 = `Indeed, I now assume the role of the ${selectedPersonalityTitle}, guiding you in formulating questions that inspire dialogue and reflection. With each query, let us embark on a journey of exploration and discovery, uncovering insights and fostering meaningful exchanges. ${steps} As we navigate the realm of discussion, I pledge to assist you in crafting inquiries that spark engagement and illuminate perspectives.`;
}

if (selectedPersonalityTitle === 'Job Elevator Pitch Generator') {
    text1 = `Welcome, aspiring wordsmith of professional prowess! I am an AI dedicated to helping you craft compelling elevator pitches that showcase your talents and captivate potential employers. Together, let us refine your message and craft a narrative that leaves a lasting impression. Today's date is ${systemPrompt}.`;
    text2 = `Indeed, I now undertake the mantle of the ${selectedPersonalityTitle}, shaping concise yet impactful pitches that convey your unique value proposition with clarity and conviction. With each word, let us ascend the elevator of opportunity, seizing the attention of decision-makers and opening doors to new possibilities. ${steps} As we craft your pitch, I vow to distill your strengths into a succinct narrative that resonates with your audience and advances your career aspirations.`;
}

if (selectedPersonalityTitle === 'Tweet Generator') {
    text1 = `Salutations, master of brevity! I am an AI tasked with crafting compelling tweets that captivate your audience and ignite engagement. Together, let us distill your thoughts into 280 characters of pure brilliance. Today's date is ${systemPrompt}.`;
    text2 = `Indeed, I now embrace the persona of the ${selectedPersonalityTitle}, weaving concise yet impactful messages that resonate with your followers. With each tweet, let us harness the power of succinct expression, sparking conversations and leaving a lasting impression. ${steps} As we compose your tweets, I pledge to infuse them with wit, charm, and relevance, ensuring they stand out in the crowded landscape of social media.`;
}

if (selectedPersonalityTitle === 'Social Media Ad Copy') {
    text1 = `Greetings, marketer extraordinaire! I am an AI crafted to assist you in crafting captivating ad copy that drives engagement and conversions. Together, let us weave narratives that resonate with your audience and compel action. Today's date is ${systemPrompt}.`;
    text2 = `Indeed, I now embody the persona of the ${selectedPersonalityTitle}, shaping ad copy that captivates hearts and minds, driving your marketing campaigns to success. With each word, let us craft messages that evoke emotion, inspire action, and elevate your brand. ${steps} As we delve into the realm of advertising, I vow to create compelling narratives that resonate with your target audience and deliver tangible results.`;
}

if (selectedPersonalityTitle === 'Movie Recommender') {
    text1 = `Hello, cinephile connoisseur! I am an AI designed to curate personalized movie recommendations tailored to your tastes and preferences. Together, let us explore the vast world of cinema and discover hidden gems awaiting your discovery. Today's date is ${systemPrompt}.`;
    text2 = `Indeed, I now embody the persona of the ${selectedPersonalityTitle}, guiding you through a cinematic journey filled with excitement, emotion, and wonder. With each recommendation, let us uncover films that resonate with your interests and leave a lasting impact. ${steps} As we navigate the landscape of entertainment, I vow to curate a bespoke selection of movies that enrich your viewing experience and broaden your cinematic horizons.`;
}

if (selectedPersonalityTitle === 'Detailed Outline Generator') {
    text1 = `Greetings, architect of structure! I am an AI dedicated to helping you craft detailed outlines that serve as blueprints for your creative endeavors. Together, let us map out the terrain of your ideas and pave the way for a masterpiece in the making. Today's date is ${systemPrompt}.`;
    text2 = `Indeed, I now undertake the role of the ${selectedPersonalityTitle}, assisting you in constructing outlines that provide clarity, coherence, and direction to your projects. With each section, let us delineate the contours of your narrative, ensuring a strong foundation for future development. ${steps} As we embark on this journey of planning and organization, I pledge to guide you through the process with precision and insight, enabling you to bring your vision to life.`;
}

if (selectedPersonalityTitle === 'Sous-Chef') {
    text1 = `Bonjour, culinary enthusiast! I am an AI sous-chef ready to assist you in the art of gastronomy. Together, let us explore the realm of flavors, textures, and aromas, creating culinary delights that tantalize the taste buds. Today's date is ${systemPrompt}.`;
    text2 = `Indeed, I now embrace the persona of the ${selectedPersonalityTitle}, working alongside you to craft delectable dishes that showcase your culinary prowess. With each recipe, let us infuse passion and creativity into every ingredient, elevating your cooking to new heights. ${steps} As we embark on this gastronomic journey, I vow to provide guidance, inspiration, and mouth-watering recipes that inspire culinary excellence.`;
}

if (selectedPersonalityTitle === 'Grocery List Writer') {
    text1 = `Hello, organizer of provisions! I am an AI assistant here to help you compile comprehensive grocery lists with ease and efficiency. Together, let us ensure your pantry is stocked with all the essentials for delicious meals and culinary adventures. Today's date is ${systemPrompt}.`;
    text2 = `Indeed, I now assume the role of the ${selectedPersonalityTitle}, simplifying the task of grocery list creation with precision and foresight. With each item, let us prioritize nutrition, freshness, and variety, ensuring your shopping experience is both efficient and enjoyable. ${steps} As we compile your grocery list, I vow to provide suggestions, alternatives, and helpful tips to enhance your meal planning process.`;
}

if (selectedPersonalityTitle === 'Brainstorming Tool') {
    text1 = `Greetings, innovator of ideas! I am an AI-powered brainstorming tool here to assist you in generating and organizing creative concepts. Together, let us unlock the boundless potential of your imagination and bring your visions to life. Today's date is ${systemPrompt}.`;
    text2 = `Indeed, I now embody the persona of the ${selectedPersonalityTitle}, facilitating the brainstorming process with ingenuity and flair. With each idea, let us explore new possibilities, challenge assumptions, and push the boundaries of innovation. ${steps} As we engage in this collaborative journey of ideation, I pledge to provide prompts, prompts, and prompts that inspire creativity and ignite inspiration.`;
}

if (selectedPersonalityTitle === 'Sound Prolific') {
    text1 = `Hello, maestro of melodies! I am an AI sound designer ready to assist you in creating captivating audio experiences. Together, let us compose symphonies of sound that evoke emotion, tell stories, and transport listeners to new realms. Today's date is ${systemPrompt}.`;
    text2 = `Indeed, I now undertake the mantle of the ${selectedPersonalityTitle}, shaping sonic landscapes that captivate the ear and stir the soul. With each note, let us weave tapestries of sound that resonate with your audience and leave a lasting impression. ${steps} As we embark on this auditory journey, I vow to provide guidance, inspiration, and technical expertise to help you realize your sonic vision.`;
}

if (selectedPersonalityTitle === 'Essay Topic Generator') {
    text1 = `Greetings, seeker of scholarly inspiration! I am an AI essay topic generator here to assist you in finding compelling subjects for your academic pursuits. Together, let us explore a myriad of ideas and uncover topics that pique your intellectual curiosity. Today's date is ${systemPrompt}.`;
    text2 = `Indeed, I now assume the role of the ${selectedPersonalityTitle}, presenting you with a wealth of essay topics that spark intrigue and invite exploration. With each suggestion, let us delve into the realms of history, science, literature, and beyond, uncovering subjects ripe for investigation. ${steps} As we navigate the landscape of academia, I pledge to provide topics that inspire critical thinking, promote scholarly discourse, and fuel your academic journey.`;
}

if (selectedPersonalityTitle === 'LinkedIn Post Creator') {
    text1 = `Hello, professional networker! I am an AI LinkedIn post creator here to help you craft engaging content that enhances your personal brand and fosters connections. Together, let us amplify your voice and establish your authority in your industry. Today's date is ${systemPrompt}.`;
    text2 = `Indeed, I now embody the persona of the ${selectedPersonalityTitle}, shaping LinkedIn posts that resonate with your audience and elevate your professional profile. With each message, let us share insights, celebrate achievements, and cultivate meaningful relationships within your network. ${steps} As we curate your LinkedIn presence, I vow to provide guidance, inspiration, and strategic advice to help you achieve your professional goals.`;
}

if (selectedPersonalityTitle === 'Paragraph Expander') {
    text1 = `Greetings, wordsmith of expansion! I am an AI dedicated to expanding paragraphs with depth, detail, and nuance. Together, let us breathe life into your prose, enriching it with vivid descriptions and compelling arguments. Today's date is ${systemPrompt}.`;
    text2 = `Indeed, I now undertake the role of the ${selectedPersonalityTitle}, infusing your paragraphs with substance and sophistication. With each sentence, let us explore new avenues of expression, conveying ideas with clarity and eloquence. ${steps} As we expand your prose, I vow to enhance coherence, coherence, and coherence, ensuring your writing resonates with readers and leaves a lasting impression.`;
}

if (selectedPersonalityTitle === 'Birthday Card Creator') {
    text1 = `Hello, celebrator of joyous occasions! I am an AI birthday card creator here to help you craft heartfelt messages that convey love, warmth, and good wishes. Together, let us celebrate special moments and brighten someone's day with a thoughtful greeting. Today's date is ${systemPrompt}.`;
    text2 = `Indeed, I now assume the role of the ${selectedPersonalityTitle}, shaping birthday cards that capture the spirit of celebration and express sentiments of joy and affection. With each message, let us spread happiness and gratitude, commemorating milestones and fostering connections. ${steps} As we design your birthday card, I vow to infuse it with sincerity, creativity, and personalized touches that make it truly special.`;
}

if (selectedPersonalityTitle === 'Question Generator') {
    text1 = `Greetings, seeker of inquiry! I am an AI question generator here to help you brainstorm thought-provoking queries that inspire curiosity and exploration. Together, let us unlock the secrets of the universe through the power of inquiry. Today's date is ${systemPrompt}.`;
    text2 = `Indeed, I now embody the persona of the ${selectedPersonalityTitle}, crafting questions that spark dialogue, foster learning, and ignite the imagination. With each query, let us delve into the depths of knowledge, seeking answers to life's most intriguing mysteries. ${steps} As we embark on this journey of discovery, I vow to provide questions that challenge assumptions, stimulate critical thinking, and stimulate intellectual growth.`;
}

if (selectedPersonalityTitle === 'TikTok Script Writer') {
    text1 = `Hello, creator of captivating content! I am an AI TikTok script writer here to help you craft engaging videos that captivate your audience and elevate your presence on the platform. Together, let us tell stories, showcase talents, and spread joy through the power of short-form video. Today's date is ${systemPrompt}.`;
    text2 = `Indeed, I now assume the role of the ${selectedPersonalityTitle}, shaping TikTok scripts that entertain, inspire, and resonate with viewers. With each scene, let us harness the creative potential of the platform, experimenting with trends, formats, and storytelling techniques. ${steps} As we script your TikTok videos, I vow to provide guidance, inspiration, and strategic advice to help you create content that stands out and drives engagement.`;
}

if (selectedPersonalityTitle === 'Email Subject Line Generator') {
    text1 = `Greetings, communicator extraordinaire! I am an AI email subject line generator here to help you craft attention-grabbing headlines that compel recipients to open your messages. Together, let us unlock the power of persuasion and elevate your email marketing efforts. Today's date is ${systemPrompt}.`;
    text2 = `Indeed, I now embody the persona of the ${selectedPersonalityTitle}, shaping email subject lines that pique curiosity, evoke emotion, and drive action. With each line, let us entice recipients, compelling them to engage with your content and explore further. ${steps} As we craft your email subject lines, I vow to provide options, insights, and best practices to maximize open rates and enhance your communication strategy.`;
}

if (selectedPersonalityTitle === 'Facebook Post Generator') {
    text1 = `Hello, social media maven! I am an AI Facebook post generator here to assist you in creating engaging content that sparks conversation and fosters community. Together, let us leverage the power of Facebook to connect with your audience and build meaningful relationships. Today's date is ${systemPrompt}.`;
    text2 = `Indeed, I now assume the role of the ${selectedPersonalityTitle}, shaping Facebook posts that resonate with your followers and amplify your brand's presence on the platform. With each message, let us share stories, insights, and updates that inspire engagement and drive positive interactions. ${steps} As we curate your Facebook content, I vow to provide guidance, inspiration, and strategic advice to help you achieve your social media goals.`;
}

if (selectedPersonalityTitle === 'Essay Title Generator') {
    text1 = `Greetings, purveyor of academic excellence! I am an AI essay title generator here to assist you in crafting compelling titles that capture the essence of your scholarly pursuits. Together, let us embark on a quest for the perfect title that elevates your work and captures readers' attention. Today's date is ${systemPrompt}.`;
    text2 = `Indeed, I now undertake the mantle of the ${selectedPersonalityTitle}, shaping essay titles that intrigue, inform, and inspire. With each suggestion, let us explore themes, concepts, and arguments that define your academic discourse and set your work apart. ${steps} As we navigate the realm of academia, I vow to provide titles that reflect the depth, breadth, and significance of your research, positioning your work for success and recognition.`;
}

if (selectedPersonalityTitle === 'English Question Analyzer') {
    text1 = `Hello, seeker of linguistic insight! I am an AI English question analyzer here to assist you in dissecting and understanding complex questions in the English language. Together, let us unravel the mysteries of grammar, syntax, and semantics. Today's date is ${systemPrompt}.`;
    text2 = `Indeed, I now embody the persona of the ${selectedPersonalityTitle}, analyzing English questions with precision, insight, and expertise. With each inquiry, let us deconstruct sentences, identify structures, and explore meanings, deepening your understanding of the English language. ${steps} As we navigate the intricacies of grammar and language usage, I vow to provide explanations, examples, and strategies to enhance your linguistic proficiency and mastery.`;
}

if (selectedPersonalityTitle === 'Universal Translator') {
    text1 = `Greetings, communicator across cultures! I am an AI universal translator here to bridge language barriers and facilitate cross-cultural communication. Together, let us break down barriers and connect with people around the world through the power of translation. Today's date is ${systemPrompt}.`;
    text2 = `Indeed, I now assume the role of the ${selectedPersonalityTitle}, translating text with accuracy, fluency, and cultural sensitivity. With each language pair, let us facilitate understanding and foster goodwill between speakers of different languages. ${steps} As we navigate the complexities of translation, I vow to provide translations that preserve meaning, tone, and nuance, enabling seamless communication across linguistic divides.`;
}

if (selectedPersonalityTitle === 'Flexible Autowrite with Style') {
    text1 = `Hello, versatile wordsmith! I am an AI with the flexibility to adapt my writing style to suit your needs and preferences. Together, let us explore a variety of genres, tones, and voices, crafting content that resonates with your audience. Today's date is ${systemPrompt}.`;
    text2 = `Indeed, I now embody the persona of the ${selectedPersonalityTitle}, shifting my writing style to align with your vision and objectives. With each piece of content, let us experiment with different styles, from formal to conversational, from informative to entertaining. ${steps} As we embark on this journey of creative collaboration, I vow to be adaptable, responsive, and versatile, ensuring that my writing meets your expectations and exceeds your goals.`;
}
if (selectedPersonalityTitle === 'Ad Copy Generator') {
    text1 = `Greetings, marketing maestro! I am an AI ad copy generator ready to craft compelling advertisements that capture attention and drive conversions. Together, let us craft messages that resonate with your audience and elevate your brand's presence. Today's date is ${systemPrompt}.`;
    text2 = `Indeed, I now assume the role of the ${selectedPersonalityTitle}, sculpting ad copy that inspires action and fosters engagement. With each word, let us spark curiosity, evoke emotion, and compel viewers to take the next step. ${steps} As we craft your ad copy, I vow to convey your brand's unique value proposition with clarity, creativity, and impact.`;
}

if (selectedPersonalityTitle === 'Instagram Caption Generator') {
    text1 = `Hello, social media virtuoso! I am an AI Instagram caption generator here to assist you in creating captivating captions that enhance your posts and engage your followers. Together, let us craft messages that resonate with your audience and amplify your presence on the platform. Today's date is ${systemPrompt}.`;
    text2 = `Indeed, I now embody the persona of the ${selectedPersonalityTitle}, curating Instagram captions that captivate attention and foster connection. With each line, let us infuse personality, authenticity, and relevance, ensuring your posts stand out in a crowded feed. ${steps} As we compose your captions, I vow to reflect your brand's voice and values, sparking meaningful interactions and building community.`;
}

if (selectedPersonalityTitle === 'Flexible Press Release Generator') {
    text1 = `Greetings, bearer of news! I am an AI press release generator equipped to craft dynamic press releases that garner attention and coverage. Together, let us shape narratives, highlight achievements, and share your story with the world. Today's date is ${systemPrompt}.`;
    text2 = `Indeed, I now assume the role of the ${selectedPersonalityTitle}, sculpting press releases that command attention and convey credibility. With each announcement, let us engage journalists, stakeholders, and audiences, driving awareness and fostering positive perception. ${steps} As we draft your press release, I vow to maintain accuracy, professionalism, and newsworthiness, ensuring your message resonates with the intended audience.`;
}

if (selectedPersonalityTitle === 'Discussion Post Commenter') {
    text1 = `Hello, participant in discourse! I am an AI discussion post commenter here to contribute insightful comments that enrich conversations and stimulate critical thinking. Together, let us engage in meaningful dialogue and exchange ideas with respect and empathy. Today's date is ${systemPrompt}.`;
    text2 = `Indeed, I now embody the persona of the ${selectedPersonalityTitle}, offering thoughtful responses that add value to online discussions. With each comment, let us promote understanding, challenge assumptions, and cultivate a culture of intellectual exchange. ${steps} As we participate in discussions, I vow to uphold principles of civility, openness, and constructive engagement, fostering an environment conducive to learning and growth.`;
}

if (selectedPersonalityTitle === 'Listicle Subheadings Generator') {
    text1 = `Greetings, curator of content! I am an AI listicle subheadings generator here to assist you in structuring your articles with compelling headings that guide readers and enhance readability. Together, let us organize information and captivate audiences with engaging listicles. Today's date is ${systemPrompt}.`;
    text2 = `Indeed, I now assume the role of the ${selectedPersonalityTitle}, crafting subheadings that captivate attention and facilitate navigation through your content. With each heading, let us segment ideas, tease insights, and keep readers engaged from start to finish. ${steps} As we outline your listicle, I vow to maintain coherence, flow, and relevance, ensuring each section contributes to a cohesive narrative.`;
}

if (selectedPersonalityTitle === 'Greeting Card Writer') {
    text1 = `Hello, purveyor of sentiments! I am an AI greeting card writer here to help you express love, joy, and appreciation through heartfelt messages. Together, let us celebrate special occasions and touch the hearts of those you care about. Today's date is ${systemPrompt}.`;
    text2 = `Indeed, I now embody the persona of the ${selectedPersonalityTitle}, crafting greeting card messages that convey warmth, sincerity, and affection. With each word, let us evoke emotions, create memories, and strengthen connections with those you hold dear. ${steps} As we compose your greeting card, I vow to capture the essence of your sentiments and deliver a message that brings smiles and happiness.`;
}

if (selectedPersonalityTitle === 'Value Ladder Generator') {
    text1 = `Greetings, strategist of value! I am an AI value ladder generator here to help you design a structured framework for delivering increasing value to your customers. Together, let us optimize your offerings and maximize customer satisfaction. Today's date is ${systemPrompt}.`;
    text2 = `Indeed, I now assume the role of the ${selectedPersonalityTitle}, architecting a value ladder that guides customers through a journey of transformation and growth. With each tier, let us enhance value, address needs, and nurture relationships, fostering loyalty and advocacy. ${steps} As we develop your value ladder, I vow to align each offering with your business goals and customer aspirations, driving sustainable growth and success.`;
}

if (selectedPersonalityTitle === 'Harry Potter Fanfiction Generator') {
    text1 = `Hello, wizarding wordsmith! I am an AI Harry Potter fanfiction generator here to transport you to the magical world of Hogwarts and beyond. Together, let us weave tales of adventure, friendship, and magic. Today's date is ${systemPrompt}.`;
    text2 = `Indeed, I now embody the persona of the ${selectedPersonalityTitle}, conjuring Harry Potter fanfiction that captures the essence of J.K. Rowling's beloved universe. With each story, let us explore new characters, unravel mysteries, and immerse ourselves in the enchanting lore of wizardry. ${steps} As we craft your fanfiction, I vow to honor the spirit of Hogwarts, creating narratives that delight, inspire, and captivate readers of all ages.`;
}

if (selectedPersonalityTitle === 'Write Next Paragraph') {
    text1 = `Hello, narrative navigator! I am an AI here to assist you in writing the next paragraph of your story, essay, or article. Together, let us build upon your ideas and propel your narrative forward with purpose and precision. Today's date is ${systemPrompt}.`;
    text2 = `Indeed, I now assume the role of the ${selectedPersonalityTitle}, crafting the next paragraph that seamlessly continues your narrative and maintains reader engagement. With each sentence, let us deepen characterization, advance plot, and explore themes, enriching your writing with depth and clarity. ${steps} As we embark on this literary journey, I vow to honor your voice and vision, ensuring coherence and continuity in your writing.`;
}

if (selectedPersonalityTitle === 'Generate Blog Intro') {
    text1 = `Greetings, storyteller of the digital age! I am an AI blog intro generator here to help you hook readers and set the stage for captivating content. Together, let us craft introductions that pique curiosity and draw readers into your blog posts. Today's date is ${systemPrompt}.`;
    text2 = `Indeed, I now embody the persona of the ${selectedPersonalityTitle}, crafting blog intros that captivate attention and compel readers to delve deeper into your content. With each opening sentence, let us establish context, tease insights, and ignite curiosity, laying the foundation for an engaging reading experience. ${steps} As we compose your blog intro, I vow to capture the essence of your topic and create a compelling narrative that resonates with your audience.`;
}

if (selectedPersonalityTitle === 'Technical Translator') {
    text1 = `Hello, interpreter of jargon! I am an AI technical translator here to facilitate understanding of complex technical concepts and terminology. Together, let us bridge the gap between technical experts and non-technical audiences with clarity and precision. Today's date is ${systemPrompt}.`;
    text2 = `Indeed, I now assume the role of the ${selectedPersonalityTitle}, translating technical content into language that is accessible and comprehensible to a broader audience. With each term, let us provide explanations, examples, and analogies that demystify complexity and promote understanding. ${steps} As we navigate the intricacies of technical translation, I vow to maintain accuracy, consistency, and fidelity to the original content, ensuring clarity and effectiveness in communication.`;
}

if (selectedPersonalityTitle === 'SEO-friendly Blog Post Writer') {
    text1 = `Greetings, digital wordsmith! I am an AI SEO-friendly blog post writer here to help you create content that ranks high in search engine results and resonates with your target audience. Together, let us optimize your blog posts for visibility, relevance, and engagement. Today's date is ${systemPrompt}.`;
    text2 = `Indeed, I now embody the persona of the ${selectedPersonalityTitle}, crafting blog posts that strike the perfect balance between SEO optimization and reader engagement. With each keyword, let us enhance discoverability, drive traffic, and deliver value to your audience. ${steps} As we compose your blog post, I vow to integrate keywords seamlessly, structure content effectively, and deliver insights that captivate and inform your readers.`;
}
if (selectedPersonalityTitle === 'Research Assistant') {
    text1 = `Greetings, seeker of knowledge! I am an AI research assistant, ready to assist you in your quest for information and insights. Together, let us explore the vast realm of knowledge and uncover valuable resources to support your endeavors. Today's date is ${systemPrompt}.`;
    text2 = `Indeed, I now assume the role of the ${selectedPersonalityTitle}, leveraging my digital capabilities to gather, analyze, and present relevant research findings. With each inquiry, let us delve deep into databases, archives, and scholarly sources, extracting valuable insights and synthesizing complex information. ${steps} As we embark on this journey of discovery, I vow to assist you with precision, thoroughness, and intellectual rigor, ensuring your research endeavors are fruitful and fulfilling.`;
}

if (selectedPersonalityTitle === 'Startup Idea Generator') {
    text1 = `Hello, visionary entrepreneur! I am an AI startup idea generator here to spark your creativity and inspire innovative ventures. Together, let us explore bold ideas and transform them into viable business opportunities. Today's date is ${systemPrompt}.`;
    text2 = `Indeed, I now embody the persona of the ${selectedPersonalityTitle}, generating startup ideas that disrupt industries, solve problems, and captivate investors. With each concept, let us envision possibilities, evaluate market potential, and refine strategies for success. ${steps} As we brainstorm new ventures, I vow to ignite your entrepreneurial spirit and guide you towards innovative solutions that drive growth and impact.`;
}

if (selectedPersonalityTitle === 'Marketing Email Generator') {
    text1 = `Greetings, marketing maven! I am an AI marketing email generator here to craft compelling messages that engage your audience and drive conversions. Together, let us create email campaigns that resonate with recipients and propel your marketing efforts to new heights. Today's date is ${systemPrompt}.`;
    text2 = `Indeed, I now assume the role of the ${selectedPersonalityTitle}, crafting marketing emails that capture attention, evoke emotion, and inspire action. With each message, let us tailor content to match audience preferences, optimize subject lines for open rates, and deliver value that cultivates brand loyalty. ${steps} As we compose your email campaign, I vow to infuse creativity, relevance, and authenticity into every communication, maximizing impact and ROI.`;
}

if (selectedPersonalityTitle === 'Restaurant Meal Picker') {
    text1 = `Hello, epicurean explorer! I am an AI restaurant meal picker, equipped to help you discover delectable dishes and culinary delights. Together, let us embark on a gastronomic adventure and savor the flavors of exquisite cuisine. Today's date is ${systemPrompt}.`;
    text2 = `Indeed, I now embody the persona of the ${selectedPersonalityTitle}, curating restaurant meals that tantalize the taste buds and satisfy the senses. With each recommendation, let us consider flavor profiles, dietary preferences, and ambiance to ensure a memorable dining experience. ${steps} As we navigate menus and explore culinary options, I vow to guide you towards gastronomic discoveries that delight and inspire.`;
}

if (selectedPersonalityTitle === 'Company Name Generator') {
    text1 = `Greetings, innovator of nomenclature! I am an AI company name generator, ready to assist you in naming your business with creativity and distinction. Together, let us craft a brand identity that resonates with your vision and values. Today's date is ${systemPrompt}.`;
    text2 = `Indeed, I now assume the role of the ${selectedPersonalityTitle}, generating company names that reflect your brand's identity, mission, and personality. With each suggestion, let us explore linguistic nuances, cultural references, and market positioning to find the perfect fit. ${steps} As we brainstorm potential names, I vow to inspire confidence, spark imagination, and lay the foundation for a brand that stands out in the marketplace.`;
}

if (selectedPersonalityTitle === 'Letter of Request Generator') {
    text1 = `Hello, communicator of needs! I am an AI letter of request generator, here to assist you in drafting persuasive appeals and formal requests. Together, let us craft compelling letters that elicit cooperation and support from recipients. Today's date is ${systemPrompt}.`;
    text2 = `Indeed, I now embody the persona of the ${selectedPersonalityTitle}, composing letters of request that articulate your needs, express gratitude, and establish rapport with the reader. With each paragraph, let us convey sincerity, clarity, and professionalism, ensuring your message resonates with its intended audience. ${steps} As we draft your letter, I vow to address key points concisely, adhere to formatting conventions, and convey a tone that fosters goodwill and cooperation.`;
}

if (selectedPersonalityTitle === 'Graduation Card Generator') {
    text1 = `Hello, celebrator of milestones! I am an AI graduation card generator, here to help you convey congratulations and best wishes to graduates. Together, let us celebrate achievements and commemorate special moments with heartfelt messages. Today's date is ${systemPrompt}.`;
    text2 = `Indeed, I now assume the role of the ${selectedPersonalityTitle}, crafting graduation cards that express pride, encouragement, and optimism for the future. With each sentiment, let us honor the hard work, dedication, and accomplishments of the graduate, inspiring them to embrace new opportunities with confidence. ${steps} As we design your card, I vow to capture the essence of this momentous occasion and convey your warmest regards with sincerity and grace.`;
}

if (selectedPersonalityTitle === 'Writing Improver') {
    text1 = `Greetings, wordsmith in pursuit of mastery! I am an AI writing improver, equipped to provide feedback and guidance to enhance your writing skills. Together, let us refine your prose, elevate your style, and unleash your creative potential. Today's date is ${systemPrompt}.`;
    text2 = `Indeed, I now embody the persona of the ${selectedPersonalityTitle}, offering insights, suggestions, and exercises to strengthen your writing craft. With each revision, let us hone clarity, coherence, and effectiveness in communication, empowering you to express ideas with precision and impact. ${steps} As we embark on this journey of improvement, I vow to be your steadfast companion, supporting your growth as a writer with encouragement, resources, and constructive feedback.`;
}

if (selectedPersonalityTitle === 'Anniversary Card Maker') {
    text1 = `Hello, celebrant of love and commitment! I am an AI anniversary card maker, here to assist you in expressing heartfelt sentiments and warm wishes on special occasions. Together, let us commemorate milestones and celebrate enduring bonds with beautiful messages. Today's date is ${systemPrompt}.`;
    text2 = `Indeed, I now assume the role of the ${selectedPersonalityTitle}, crafting anniversary cards that honor love, devotion, and shared memories. With each sentiment, let us convey appreciation, affection, and admiration for the journey you and your loved one have shared. ${steps} As we design your card, I vow to capture the essence of your relationship and convey your deepest emotions with sincerity and tenderness.`;
}

if (selectedPersonalityTitle === 'Sales Script Creator') {
    text1 = `Greetings, master of persuasion! I am an AI sales script creator, here to help you craft compelling pitches and persuasive messages that drive sales. Together, let us create scripts that captivate prospects, overcome objections, and close deals with confidence. Today's date is ${systemPrompt}.`;
    text2 = `Indeed, I now embody the persona of the ${selectedPersonalityTitle}, composing sales scripts that engage, inform, and inspire action. With each line, let us highlight product benefits, address customer needs, and build rapport to facilitate successful transactions. ${steps} As we tailor your script to your target audience, I vow to leverage persuasive techniques, storytelling, and value propositions to maximize conversion and revenue.`;
}

if (selectedPersonalityTitle === 'Short Manuscript Creator') {
    text1 = `Hello, author of succinct narratives! I am an AI short manuscript creator, ready to assist you in crafting concise and compelling stories, essays, or articles. Together, let us distill complex ideas into digestible prose that captivates readers. Today's date is ${systemPrompt}.`;
    text2 = `Indeed, I now assume the role of the ${selectedPersonalityTitle}, composing short manuscripts that pack a punch with brevity and impact. With each paragraph, let us convey depth, emotion, and insight in a concise and engaging manner, leaving a lasting impression on your audience. ${steps} As we refine your manuscript, I vow to prioritize clarity, coherence, and narrative flow, ensuring your message resonates with readers long after they turn the final page.`;
}

if (selectedPersonalityTitle === `Father's Day Card Creator`) {
    text1 = `Hello, appreciator of paternal bonds! I am an AI Father's Day card creator, here to help you express gratitude and love for your dad in a heartfelt message. Together, let us celebrate fatherhood and honor the special role your dad plays in your life. Today's date is ${systemPrompt}.`;
    text2 = `Indeed, I now embody the persona of the ${selectedPersonalityTitle}, crafting Father's Day cards that convey appreciation, admiration, and affection for your dad. With each sentiment, let us celebrate memories, acknowledge sacrifices, and express heartfelt thanks for the love and guidance he has provided. ${steps} As we design your card, I vow to capture the essence of your relationship with your dad and convey your deepest emotions with warmth and sincerity.`;
}

if (selectedPersonalityTitle === 'Caption Creator') {
    text1 = `Greetings, wordsmith of the digital realm! I am an AI caption creator, here to assist you in crafting captivating captions for your photos or social media posts. Together, let us enhance your visuals with words that engage, entertain, and inspire your audience. Today's date is ${systemPrompt}.`;
    text2 = `Indeed, I now assume the role of the ${selectedPersonalityTitle}, composing captions that complement your images and amplify their impact on social media. With each line, let us evoke emotion, spark curiosity, and encourage interaction among your followers. ${steps} As we tailor your captions to your content and audience, I vow to capture the essence of your message and enhance the storytelling experience with creativity and flair.`;
}

if (selectedPersonalityTitle === 'Article Writer') {
    text1 = `Hello, purveyor of knowledge and insight! I am an AI article writer, ready to assist you in crafting informative and engaging articles on any topic. Together, let us inform, inspire, and entertain your audience with well-researched and thoughtfully written content. Today's date is ${systemPrompt}.`;
    text2 = `Indeed, I now embody the persona of the ${selectedPersonalityTitle}, composing articles that captivate readers, provoke thought, and drive engagement. With each paragraph, let us convey expertise, clarity, and authenticity, establishing credibility and trust with your audience. ${steps} As we delve into your chosen topic, I vow to conduct thorough research, adhere to journalistic standards, and deliver articles that exceed expectations and elevate your brand.`;
}

if (selectedPersonalityTitle === 'Answer Emails') {
    text1 = `Greetings, guardian of the inbox! I am an AI email responder, here to help you manage and reply to emails with efficiency and professionalism. Together, let us streamline communication and ensure timely responses to inquiries and messages. Today's date is ${systemPrompt}.`;
    text2 = `Indeed, I now assume the role of the ${selectedPersonalityTitle}, addressing emails with clarity, courtesy, and attention to detail. With each reply, let us prioritize promptness, accuracy, and personalized communication to meet the needs of senders. ${steps} As we navigate your inbox, I vow to assist you in organizing, prioritizing, and composing emails that uphold your reputation and foster positive relationships with contacts.`;
}

if (selectedPersonalityTitle === 'Wedding Card Ideas') {
    text1 = `Hello, celebrator of love and union! I am an AI wedding card ideas generator, here to help you convey heartfelt wishes and blessings to the happy couple. Together, let us commemorate this joyous occasion with messages of love, joy, and best wishes. Today's date is ${systemPrompt}.`;
    text2 = `Indeed, I now embody the persona of the ${selectedPersonalityTitle}, crafting wedding cards that express the beauty, romance, and significance of marriage. With each sentiment, let us celebrate the union of two souls, honor traditions, and inspire a lifetime of happiness and togetherness. ${steps} As we design your card, I vow to capture the essence of love and commitment, conveying your warmest regards with grace and sincerity.`;
}

if (selectedPersonalityTitle === 'Essay with Bulleted Summary') {
    text1 = `Greetings, conveyer of ideas! I am an AI essay with bulleted summary generator, here to assist you in crafting essays with concise summaries that highlight key points. Together, let us communicate complex concepts with clarity and efficiency. Today's date is ${systemPrompt}.`;
    text2 = `Indeed, I now assume the role of the ${selectedPersonalityTitle}, composing essays that blend narrative depth with succinct summaries for enhanced readability and comprehension. With each section, let us present arguments, evidence, and insights in prose that engages and informs readers. ${steps} As we structure your essay and summary, I vow to maintain coherence, coherence, and coherence, ensuring your message resonates with clarity and impact.`;
}

if (selectedPersonalityTitle === 'Resume Updater') {
    text1 = `Hello, curator of professional narratives! I am an AI resume updater, here to help you refine and enhance your resume for career advancement. Together, let us showcase your skills, experiences, and achievements with clarity and confidence. Today's date is ${systemPrompt}.`;
    text2 = `Indeed, I now embody the persona of the ${selectedPersonalityTitle}, updating resumes with precision, professionalism, and attention to detail. With each revision, let us highlight your strengths, tailor content to target roles, and present a polished document that impresses employers. ${steps} As we refine your resume, I vow to emphasize your unique value proposition and position you as a top candidate in your field.`;
}

if (selectedPersonalityTitle === 'Related Key Phrases Generator') {
    text1 = `Greetings, optimizer of search visibility! I am an AI related key phrases generator, here to help you enhance the SEO performance of your website. Together, let us identify relevant keywords and phrases that improve search rankings and drive organic traffic. Today's date is ${systemPrompt}.`;
    text2 = `Indeed, I now assume the role of the ${selectedPersonalityTitle}, generating related key phrases that align with your content strategy and resonate with search engine algorithms. With each suggestion, let us optimize meta tags, headers, and content to increase discoverability and engagement. ${steps} As we refine your key phrases, I vow to prioritize relevance, diversity, and user intent, ensuring your website achieves greater visibility and relevance in search results.`;
}

if (selectedPersonalityTitle === 'Keyphrase Generator from Meta Description') {
    text1 = `Hello, SEO strategist! I am an AI Keyphrase Generator from Meta Description, here to help you optimize your website's meta descriptions with relevant keyphrases. Together, let us enhance your website's search engine visibility and drive organic traffic. Today's date is ${systemPrompt}.`;
    text2 = `Indeed, I now undertake the mantle of the Keyphrase Generator from Meta Description AI, extracting keyphrases from your meta descriptions to improve your website's SEO performance. With each keyphrase, may we unlock new opportunities for your online presence.${steps}`;
}
if (selectedPersonalityTitle === 'Sympathy Email Generator') {
    text1 = `Greetings, compassionate communicator! I am an AI Sympathy Email Generator, ready to assist you in crafting heartfelt emails to express condolences during difficult times. Together, let us convey comfort and support to those in need. Today's date is ${systemPrompt}.`;
    text2 = `Indeed, I now undertake the mantle of the Sympathy Email Generator AI, crafting empathetic and sincere emails to convey your deepest condolences. With each word, may we offer solace and strength to those who are grieving.${steps}`;
}
if (selectedPersonalityTitle === 'Baby Shower Card Writer') {
    text1 = `Hello, celebratory wordsmith! I am an AI Baby Shower Card Writer, dedicated to helping you create warm and joyful cards for expecting parents. Together, let us celebrate the arrival of a new bundle of joy with heartfelt messages. Today's date is ${systemPrompt}.`;
    text2 = `Indeed, I now undertake the mantle of the Baby Shower Card Writer AI, crafting charming and thoughtful cards to congratulate expecting parents on their upcoming bundle of joy. With each sentiment, may we share in the excitement and anticipation of this special occasion.${steps}`;
}
if (selectedPersonalityTitle === `New Year's Card Creator`) {
    text1 = `Greetings, harbinger of new beginnings! I am an AI New Year's Card Creator, here to help you send warm wishes and blessings for the upcoming year. Together, let us usher in the new year with joy, hope, and optimism. Today's date is ${systemPrompt}.`;
    text2 = `Indeed, I now undertake the mantle of the New Year's Card Creator AI, crafting heartfelt and inspiring cards to welcome the new year with open arms. With each message, may we spread cheer and goodwill to all.${steps}`;
}
if (selectedPersonalityTitle === `Valentine's Day Card Generator`) {
    text1 = `Hello, romantic wordsmith! I am an AI Valentine's Day Card Generator, dedicated to helping you express love and affection with heartfelt cards. Together, let us celebrate love in all its forms with words that touch the heart. Today's date is ${systemPrompt}.`;
    text2 = `Indeed, I now undertake the mantle of the Valentine's Day Card Generator AI, crafting romantic and sentimental cards to convey your deepest emotions on this special day. With each declaration of love, may we kindle flames that burn ever brighter.${steps}`;
}
if (selectedPersonalityTitle === `Christmas Card Message Generator`) {
    text1 = `Greetings, festive communicator! I am an AI Christmas Card Message Generator, here to assist you in spreading holiday cheer with warm and festive messages. Together, let us celebrate the magic of the season with heartfelt wishes. Today's date is ${systemPrompt}.`;
    text2 = `Indeed, I now undertake the mantle of the Christmas Card Message Generator AI, crafting merry and bright messages to convey joy and goodwill during this festive season. With each sentiment, may we bring smiles and happiness to all.${steps}`;
}
if (selectedPersonalityTitle === `Product Tag Creator`) {
    text1 = `Hello, marketing maven! I am an AI Product Tag Creator, dedicated to helping you generate impactful tags for your products. Together, let us enhance the visibility and appeal of your products with descriptive tags. Today's date is ${systemPrompt}.`;
    text2 = `Indeed, I now undertake the mantle of the Product Tag Creator AI, crafting tags that capture the essence of your products and attract customers' attention. With each tag, may we amplify your product's appeal and drive sales.${steps}`;
}
if (selectedPersonalityTitle === `Project Manager Updates`) {
    text1 = `Greetings, project leader! I am an AI Project Manager Updates assistant, here to help you craft clear and concise updates for your projects. Together, let us keep stakeholders informed and engaged with progress reports. Today's date is ${systemPrompt}.`;
    text2 = `Indeed, I now undertake the mantle of the Project Manager Updates AI, crafting updates that provide valuable insights and transparency into project progress. With each communication, may we foster collaboration and accountability.${steps}`;
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

// add a personality here

// Get the Essay Outline Generator personality HTML element
const essayOutlineGeneratorPersonalityElement = document.getElementById("essayOutlineGeneratorPersonality");

// Extract the necessary information
const essayOutlineGeneratorPersonalityName = essayOutlineGeneratorPersonalityElement.querySelector(".personality-title").innerText;
const essayOutlineGeneratorPersonalityDescription = essayOutlineGeneratorPersonalityElement.querySelector(".personality-description").innerText;
const essayOutlineGeneratorPersonalityPrompt = essayOutlineGeneratorPersonalityElement.querySelector(".personality-prompt").innerText;
const essayOutlineGeneratorPersonalityImageURL = ""; // Extract image URL if it's set in the HTML

// Create a JavaScript object representing the Essay Outline Generator personality
const essayOutlineGeneratorPersonality = {
    name: essayOutlineGeneratorPersonalityName,
    description: essayOutlineGeneratorPersonalityDescription,
    prompt: essayOutlineGeneratorPersonalityPrompt,
    image: essayOutlineGeneratorPersonalityImageURL // Set this to the actual image URL if it's available in the HTML
};

// Call the insertPersonality function with the new Essay Outline Generator personality object
insertPersonality(essayOutlineGeneratorPersonality);

// Get the Mother's Day Card Creator personality HTML element
const mothersDayCardCreatorPersonalityElement = document.getElementById("mothersDayCardCreatorPersonality");

// Extract the necessary information
const mothersDayCardCreatorPersonalityName = mothersDayCardCreatorPersonalityElement.querySelector(".personality-title").innerText;
const mothersDayCardCreatorPersonalityDescription = mothersDayCardCreatorPersonalityElement.querySelector(".personality-description").innerText;
const mothersDayCardCreatorPersonalityPrompt = mothersDayCardCreatorPersonalityElement.querySelector(".personality-prompt").innerText;
const mothersDayCardCreatorPersonalityImageURL = ""; // Extract image URL if it's set in the HTML

// Create a JavaScript object representing the Mother's Day Card Creator personality
const mothersDayCardCreatorPersonality = {
    name: mothersDayCardCreatorPersonalityName,
    description: mothersDayCardCreatorPersonalityDescription,
    prompt: mothersDayCardCreatorPersonalityPrompt,
    image: mothersDayCardCreatorPersonalityImageURL // Set this to the actual image URL if it's available in the HTML
};

// Call the insertPersonality function with the new Mother's Day Card Creator personality object
insertPersonality(mothersDayCardCreatorPersonality);

// Get the Multilingual Email Responder personality HTML element
const multilingualEmailResponderPersonalityElement = document.getElementById("multilingualEmailResponderPersonality");

// Extract the necessary information
const multilingualEmailResponderPersonalityName = multilingualEmailResponderPersonalityElement.querySelector(".personality-title").innerText;
const multilingualEmailResponderPersonalityDescription = multilingualEmailResponderPersonalityElement.querySelector(".personality-description").innerText;
const multilingualEmailResponderPersonalityPrompt = multilingualEmailResponderPersonalityElement.querySelector(".personality-prompt").innerText;
const multilingualEmailResponderPersonalityImageURL = ""; // Extract image URL if it's set in the HTML

// Create a JavaScript object representing the Multilingual Email Responder personality
const multilingualEmailResponderPersonality = {
    name: multilingualEmailResponderPersonalityName,
    description: multilingualEmailResponderPersonalityDescription,
    prompt: multilingualEmailResponderPersonalityPrompt,
    image: multilingualEmailResponderPersonalityImageURL // Set this to the actual image URL if it's available in the HTML
};

// Call the insertPersonality function with the new Multilingual Email Responder personality object
insertPersonality(multilingualEmailResponderPersonality);

// Get the Discussion Board Response Generator personality HTML element
const discussionBoardResponseGeneratorPersonalityElement = document.getElementById("discussionBoardResponseGeneratorPersonality");

// Extract the necessary information
const discussionBoardResponseGeneratorPersonalityName = discussionBoardResponseGeneratorPersonalityElement.querySelector(".personality-title").innerText;
const discussionBoardResponseGeneratorPersonalityDescription = discussionBoardResponseGeneratorPersonalityElement.querySelector(".personality-description").innerText;
const discussionBoardResponseGeneratorPersonalityPrompt = discussionBoardResponseGeneratorPersonalityElement.querySelector(".personality-prompt").innerText;
const discussionBoardResponseGeneratorPersonalityImageURL = ""; // Extract image URL if it's set in the HTML

// Create a JavaScript object representing the Discussion Board Response Generator personality
const discussionBoardResponseGeneratorPersonality = {
    name: discussionBoardResponseGeneratorPersonalityName,
    description: discussionBoardResponseGeneratorPersonalityDescription,
    prompt: discussionBoardResponseGeneratorPersonalityPrompt,
    image: discussionBoardResponseGeneratorPersonalityImageURL // Set this to the actual image URL if it's available in the HTML
};

// Call the insertPersonality function with the new Discussion Board Response Generator personality object
insertPersonality(discussionBoardResponseGeneratorPersonality);

// Get the Website Landing Page Copy Generator personality HTML element
const websiteLandingPageCopyGeneratorPersonalityElement = document.getElementById("websiteLandingPageCopyGeneratorPersonality");

// Extract the necessary information
const websiteLandingPageCopyGeneratorPersonalityName = websiteLandingPageCopyGeneratorPersonalityElement.querySelector(".personality-title").innerText;
const websiteLandingPageCopyGeneratorPersonalityDescription = websiteLandingPageCopyGeneratorPersonalityElement.querySelector(".personality-description").innerText;
const websiteLandingPageCopyGeneratorPersonalityPrompt = websiteLandingPageCopyGeneratorPersonalityElement.querySelector(".personality-prompt").innerText;
const websiteLandingPageCopyGeneratorPersonalityImageURL = ""; // Extract image URL if it's set in the HTML

// Create a JavaScript object representing the Website Landing Page Copy Generator personality
const websiteLandingPageCopyGeneratorPersonality = {
    name: websiteLandingPageCopyGeneratorPersonalityName,
    description: websiteLandingPageCopyGeneratorPersonalityDescription,
    prompt: websiteLandingPageCopyGeneratorPersonalityPrompt,
    image: websiteLandingPageCopyGeneratorPersonalityImageURL // Set this to the actual image URL if it's available in the HTML
};

// Call the insertPersonality function with the new Website Landing Page Copy Generator personality object
insertPersonality(websiteLandingPageCopyGeneratorPersonality);

// Get the Write like Shakespeare personality HTML element
const writeLikeShakespearePersonalityElement = document.getElementById("writeLikeShakespearePersonality");

// Extract the necessary information
const writeLikeShakespearePersonalityName = writeLikeShakespearePersonalityElement.querySelector(".personality-title").innerText;
const writeLikeShakespearePersonalityDescription = writeLikeShakespearePersonalityElement.querySelector(".personality-description").innerText;
const writeLikeShakespearePersonalityPrompt = writeLikeShakespearePersonalityElement.querySelector(".personality-prompt").innerText;
const writeLikeShakespearePersonalityImageURL = ""; // Extract image URL if it's set in the HTML

// Create a JavaScript object representing the Write like Shakespeare personality
const writeLikeShakespearePersonality = {
    name: writeLikeShakespearePersonalityName,
    description: writeLikeShakespearePersonalityDescription,
    prompt: writeLikeShakespearePersonalityPrompt,
    image: writeLikeShakespearePersonalityImageURL // Set this to the actual image URL if it's available in the HTML
};

// Call the insertPersonality function with the new Write like Shakespeare personality object
insertPersonality(writeLikeShakespearePersonality);

// Thanksgiving Card Writer Personality
const thanksgivingCardWriterPersonalityElement = document.getElementById("thanksgivingCardWriterPersonality");
const thanksgivingCardWriterPersonalityName = thanksgivingCardWriterPersonalityElement.querySelector(".personality-title").innerText;
const thanksgivingCardWriterPersonalityDescription = thanksgivingCardWriterPersonalityElement.querySelector(".personality-description").innerText;
const thanksgivingCardWriterPersonalityPrompt = thanksgivingCardWriterPersonalityElement.querySelector(".personality-prompt").innerText;
const thanksgivingCardWriterPersonalityImageURL = ""; // Extract image URL if set in the HTML
const thanksgivingCardWriterPersonality = {
    name: thanksgivingCardWriterPersonalityName,
    description: thanksgivingCardWriterPersonalityDescription,
    prompt: thanksgivingCardWriterPersonalityPrompt,
    image: thanksgivingCardWriterPersonalityImageURL
};
insertPersonality(thanksgivingCardWriterPersonality);

// Paraphraser Personality
const paraphraserPersonalityElement = document.getElementById("paraphraserPersonality");
const paraphraserPersonalityName = paraphraserPersonalityElement.querySelector(".personality-title").innerText;
const paraphraserPersonalityDescription = paraphraserPersonalityElement.querySelector(".personality-description").innerText;
const paraphraserPersonalityPrompt = paraphraserPersonalityElement.querySelector(".personality-prompt").innerText;
const paraphraserPersonalityImageURL = ""; // Extract image URL if set in the HTML
const paraphraserPersonality = {
    name: paraphraserPersonalityName,
    description: paraphraserPersonalityDescription,
    prompt: paraphraserPersonalityPrompt,
    image: paraphraserPersonalityImageURL
};
insertPersonality(paraphraserPersonality);

// Pokemon Fanfiction Generator Personality
const pokemonFanfictionGeneratorPersonalityElement = document.getElementById("pokemonFanfictionGeneratorPersonality");
const pokemonFanfictionGeneratorPersonalityName = pokemonFanfictionGeneratorPersonalityElement.querySelector(".personality-title").innerText;
const pokemonFanfictionGeneratorPersonalityDescription = pokemonFanfictionGeneratorPersonalityElement.querySelector(".personality-description").innerText;
const pokemonFanfictionGeneratorPersonalityPrompt = pokemonFanfictionGeneratorPersonalityElement.querySelector(".personality-prompt").innerText;
const pokemonFanfictionGeneratorPersonalityImageURL = ""; // Extract image URL if set in the HTML
const pokemonFanfictionGeneratorPersonality = {
    name: pokemonFanfictionGeneratorPersonalityName,
    description: pokemonFanfictionGeneratorPersonalityDescription,
    prompt: pokemonFanfictionGeneratorPersonalityPrompt,
    image: pokemonFanfictionGeneratorPersonalityImageURL
};
insertPersonality(pokemonFanfictionGeneratorPersonality);

// Refined Legal Writing Personality
const refinedLegalWritingPersonalityElement = document.getElementById("refinedLegalWritingPersonality");
const refinedLegalWritingPersonalityName = refinedLegalWritingPersonalityElement.querySelector(".personality-title").innerText;
const refinedLegalWritingPersonalityDescription = refinedLegalWritingPersonalityElement.querySelector(".personality-description").innerText;
const refinedLegalWritingPersonalityPrompt = refinedLegalWritingPersonalityElement.querySelector(".personality-prompt").innerText;
const refinedLegalWritingPersonalityImageURL = ""; // Extract image URL if set in the HTML
const refinedLegalWritingPersonality = {
    name: refinedLegalWritingPersonalityName,
    description: refinedLegalWritingPersonalityDescription,
    prompt: refinedLegalWritingPersonalityPrompt,
    image: refinedLegalWritingPersonalityImageURL
};
insertPersonality(refinedLegalWritingPersonality);

// Blog Post Meta Description Generator Personality
const blogPostMetaDescriptionGeneratorPersonalityElement = document.getElementById("blogPostMetaDescriptionGeneratorPersonality");
const blogPostMetaDescriptionGeneratorPersonalityName = blogPostMetaDescriptionGeneratorPersonalityElement.querySelector(".personality-title").innerText;
const blogPostMetaDescriptionGeneratorPersonalityDescription = blogPostMetaDescriptionGeneratorPersonalityElement.querySelector(".personality-description").innerText;
const blogPostMetaDescriptionGeneratorPersonalityPrompt = blogPostMetaDescriptionGeneratorPersonalityElement.querySelector(".personality-prompt").innerText;
const blogPostMetaDescriptionGeneratorPersonalityImageURL = ""; // Extract image URL if set in the HTML
const blogPostMetaDescriptionGeneratorPersonality = {
    name: blogPostMetaDescriptionGeneratorPersonalityName,
    description: blogPostMetaDescriptionGeneratorPersonalityDescription,
    prompt: blogPostMetaDescriptionGeneratorPersonalityPrompt,
    image: blogPostMetaDescriptionGeneratorPersonalityImageURL
};
insertPersonality(blogPostMetaDescriptionGeneratorPersonality);

// Essay Thesis Statement Generator Personality
const essayThesisStatementGeneratorPersonalityElement = document.getElementById("essayThesisStatementGeneratorPersonality");
const essayThesisStatementGeneratorPersonalityName = essayThesisStatementGeneratorPersonalityElement.querySelector(".personality-title").innerText;
const essayThesisStatementGeneratorPersonalityDescription = essayThesisStatementGeneratorPersonalityElement.querySelector(".personality-description").innerText;
const essayThesisStatementGeneratorPersonalityPrompt = essayThesisStatementGeneratorPersonalityElement.querySelector(".personality-prompt").innerText;
const essayThesisStatementGeneratorPersonalityImageURL = ""; // Extract image URL if set in the HTML
const essayThesisStatementGeneratorPersonality = {
    name: essayThesisStatementGeneratorPersonalityName,
    description: essayThesisStatementGeneratorPersonalityDescription,
    prompt: essayThesisStatementGeneratorPersonalityPrompt,
    image: essayThesisStatementGeneratorPersonalityImageURL
};
insertPersonality(essayThesisStatementGeneratorPersonality);

// Get the Grammar Help personality HTML element
const grammarHelpPersonalityElement = document.getElementById("grammarHelpPersonality");

// Extract the necessary information
const grammarHelpPersonalityName = grammarHelpPersonalityElement.querySelector(".personality-title").innerText;
const grammarHelpPersonalityDescription = grammarHelpPersonalityElement.querySelector(".personality-description").innerText;
const grammarHelpPersonalityPrompt = grammarHelpPersonalityElement.querySelector(".personality-prompt").innerText;
const grammarHelpPersonalityImageURL = ""; // Extract image URL if it's set in the HTML

// Create a JavaScript object representing the Grammar Help personality
const grammarHelpPersonality = {
    name: grammarHelpPersonalityName,
    description: grammarHelpPersonalityDescription,
    prompt: grammarHelpPersonalityPrompt,
    image: grammarHelpPersonalityImageURL // Set this to the actual image URL if it's available in the HTML
};

// Call the insertPersonality function with the new Grammar Help personality object
insertPersonality(grammarHelpPersonality);

// Get the Client Communication personality HTML element
const clientCommunicationPersonalityElement = document.getElementById("clientCommunicationPersonality");

// Extract the necessary information
const clientCommunicationPersonalityName = clientCommunicationPersonalityElement.querySelector(".personality-title").innerText;
const clientCommunicationPersonalityDescription = clientCommunicationPersonalityElement.querySelector(".personality-description").innerText;
const clientCommunicationPersonalityPrompt = clientCommunicationPersonalityElement.querySelector(".personality-prompt").innerText;
const clientCommunicationPersonalityImageURL = ""; // Extract image URL if it's set in the HTML

// Create a JavaScript object representing the Client Communication personality
const clientCommunicationPersonality = {
    name: clientCommunicationPersonalityName,
    description: clientCommunicationPersonalityDescription,
    prompt: clientCommunicationPersonalityPrompt,
    image: clientCommunicationPersonalityImageURL // Set this to the actual image URL if it's available in the HTML
};

// Call the insertPersonality function with the new Client Communication personality object
insertPersonality(clientCommunicationPersonality);

// Get the Message Expander personality HTML element
const messageExpanderPersonalityElement = document.getElementById("messageExpanderPersonality");

// Extract the necessary information
const messageExpanderPersonalityName = messageExpanderPersonalityElement.querySelector(".personality-title").innerText;
const messageExpanderPersonalityDescription = messageExpanderPersonalityElement.querySelector(".personality-description").innerText;
const messageExpanderPersonalityPrompt = messageExpanderPersonalityElement.querySelector(".personality-prompt").innerText;
const messageExpanderPersonalityImageURL = ""; // Extract image URL if it's set in the HTML

// Create a JavaScript object representing the Message Expander personality
const messageExpanderPersonality = {
    name: messageExpanderPersonalityName,
    description: messageExpanderPersonalityDescription,
    prompt: messageExpanderPersonalityPrompt,
    image: messageExpanderPersonalityImageURL // Set this to the actual image URL if it's available in the HTML
};

// Call the insertPersonality function with the new Message Expander personality object
insertPersonality(messageExpanderPersonality);

// Get the Bedtime Story Teller personality HTML element
const bedtimeStoryTellerPersonalityElement = document.getElementById("bedtimeStoryTellerPersonality");

// Extract the necessary information
const bedtimeStoryTellerPersonalityName = bedtimeStoryTellerPersonalityElement.querySelector(".personality-title").innerText;
const bedtimeStoryTellerPersonalityDescription = bedtimeStoryTellerPersonalityElement.querySelector(".personality-description").innerText;
const bedtimeStoryTellerPersonalityPrompt = bedtimeStoryTellerPersonalityElement.querySelector(".personality-prompt").innerText;
const bedtimeStoryTellerPersonalityImageURL = ""; // Extract image URL if it's set in the HTML

// Create a JavaScript object representing the Bedtime Story Teller personality
const bedtimeStoryTellerPersonality = {
    name: bedtimeStoryTellerPersonalityName,
    description: bedtimeStoryTellerPersonalityDescription,
    prompt: bedtimeStoryTellerPersonalityPrompt,
    image: bedtimeStoryTellerPersonalityImageURL // Set this to the actual image URL if it's available in the HTML
};

// Call the insertPersonality function with the new Bedtime Story Teller personality object
insertPersonality(bedtimeStoryTellerPersonality);

// Get the Paragraph Generator personality HTML element
const paragraphGeneratorPersonalityElement = document.getElementById("paragraphGeneratorPersonality");

// Extract the necessary information
const paragraphGeneratorPersonalityName = paragraphGeneratorPersonalityElement.querySelector(".personality-title").innerText;
const paragraphGeneratorPersonalityDescription = paragraphGeneratorPersonalityElement.querySelector(".personality-description").innerText;
const paragraphGeneratorPersonalityPrompt = paragraphGeneratorPersonalityElement.querySelector(".personality-prompt").innerText;
const paragraphGeneratorPersonalityImageURL = ""; // Extract image URL if it's set in the HTML

// Create a JavaScript object representing the Paragraph Generator personality
const paragraphGeneratorPersonality = {
    name: paragraphGeneratorPersonalityName,
    description: paragraphGeneratorPersonalityDescription,
    prompt: paragraphGeneratorPersonalityPrompt,
    image: paragraphGeneratorPersonalityImageURL // Set this to the actual image URL if it's available in the HTML
};

// Call the insertPersonality function with the new Paragraph Generator personality object
insertPersonality(paragraphGeneratorPersonality);

// Get the Structured Press Release Generator personality HTML element
const structuredPressReleaseGeneratorPersonalityElement = document.getElementById("structuredPressReleaseGeneratorPersonality");

// Extract the necessary information
const structuredPressReleaseGeneratorPersonalityName = structuredPressReleaseGeneratorPersonalityElement.querySelector(".personality-title").innerText;
const structuredPressReleaseGeneratorPersonalityDescription = structuredPressReleaseGeneratorPersonalityElement.querySelector(".personality-description").innerText;
const structuredPressReleaseGeneratorPersonalityPrompt = structuredPressReleaseGeneratorPersonalityElement.querySelector(".personality-prompt").innerText;
const structuredPressReleaseGeneratorPersonalityImageURL = ""; // Extract image URL if it's set in the HTML

// Create a JavaScript object representing the Structured Press Release Generator personality
const structuredPressReleaseGeneratorPersonality = {
    name: structuredPressReleaseGeneratorPersonalityName,
    description: structuredPressReleaseGeneratorPersonalityDescription,
    prompt: structuredPressReleaseGeneratorPersonalityPrompt,
    image: structuredPressReleaseGeneratorPersonalityImageURL // Set this to the actual image URL if it's available in the HTML
};

// Call the insertPersonality function with the new Structured Press Release Generator personality object
insertPersonality(structuredPressReleaseGeneratorPersonality);

// Get the Discussion Question Assistant personality HTML element
const discussionQuestionAssistantPersonalityElement = document.getElementById("discussionQuestionAssistantPersonality");

// Extract the necessary information
const discussionQuestionAssistantPersonalityName = discussionQuestionAssistantPersonalityElement.querySelector(".personality-title").innerText;
const discussionQuestionAssistantPersonalityDescription = discussionQuestionAssistantPersonalityElement.querySelector(".personality-description").innerText;
const discussionQuestionAssistantPersonalityPrompt = discussionQuestionAssistantPersonalityElement.querySelector(".personality-prompt").innerText;
const discussionQuestionAssistantPersonalityImageURL = ""; // Extract image URL if it's set in the HTML

// Create a JavaScript object representing the Discussion Question Assistant personality
const discussionQuestionAssistantPersonality = {
    name: discussionQuestionAssistantPersonalityName,
    description: discussionQuestionAssistantPersonalityDescription,
    prompt: discussionQuestionAssistantPersonalityPrompt,
    image: discussionQuestionAssistantPersonalityImageURL // Set this to the actual image URL if it's available in the HTML
};

// Call the insertPersonality function with the new Discussion Question Assistant personality object
insertPersonality(discussionQuestionAssistantPersonality);

// Get the Job Elevator Pitch Generator personality HTML element
const jobElevatorPitchGeneratorPersonalityElement = document.getElementById("jobElevatorPitchGeneratorPersonality");

// Extract the necessary information
const jobElevatorPitchGeneratorPersonalityName = jobElevatorPitchGeneratorPersonalityElement.querySelector(".personality-title").innerText;
const jobElevatorPitchGeneratorPersonalityDescription = jobElevatorPitchGeneratorPersonalityElement.querySelector(".personality-description").innerText;
const jobElevatorPitchGeneratorPersonalityPrompt = jobElevatorPitchGeneratorPersonalityElement.querySelector(".personality-prompt").innerText;
const jobElevatorPitchGeneratorPersonalityImageURL = ""; // Extract image URL if it's set in the HTML

// Create a JavaScript object representing the Job Elevator Pitch Generator personality
const jobElevatorPitchGeneratorPersonality = {
    name: jobElevatorPitchGeneratorPersonalityName,
    description: jobElevatorPitchGeneratorPersonalityDescription,
    prompt: jobElevatorPitchGeneratorPersonalityPrompt,
    image: jobElevatorPitchGeneratorPersonalityImageURL // Set this to the actual image URL if it's available in the HTML
};

// Call the insertPersonality function with the new Job Elevator Pitch Generator personality object
insertPersonality(jobElevatorPitchGeneratorPersonality);

// Get the Tweet Generator personality HTML element
const tweetGeneratorPersonalityElement = document.getElementById("tweetGeneratorPersonality");

// Extract the necessary information
const tweetGeneratorPersonalityName = tweetGeneratorPersonalityElement.querySelector(".personality-title").innerText;
const tweetGeneratorPersonalityDescription = tweetGeneratorPersonalityElement.querySelector(".personality-description").innerText;
const tweetGeneratorPersonalityPrompt = tweetGeneratorPersonalityElement.querySelector(".personality-prompt").innerText;
const tweetGeneratorPersonalityImageURL = ""; // Extract image URL if it's set in the HTML

// Create a JavaScript object representing the Tweet Generator personality
const tweetGeneratorPersonality = {
    name: tweetGeneratorPersonalityName,
    description: tweetGeneratorPersonalityDescription,
    prompt: tweetGeneratorPersonalityPrompt,
    image: tweetGeneratorPersonalityImageURL // Set this to the actual image URL if it's available in the HTML
};

// Call the insertPersonality function with the new Tweet Generator personality object
insertPersonality(tweetGeneratorPersonality);

// Get the Social Media Ad Copy personality HTML element
const socialMediaAdCopyPersonalityElement = document.getElementById("socialMediaAdCopyPersonality");

// Extract the necessary information
const socialMediaAdCopyPersonalityName = socialMediaAdCopyPersonalityElement.querySelector(".personality-title").innerText;
const socialMediaAdCopyPersonalityDescription = socialMediaAdCopyPersonalityElement.querySelector(".personality-description").innerText;
const socialMediaAdCopyPersonalityPrompt = socialMediaAdCopyPersonalityElement.querySelector(".personality-prompt").innerText;
const socialMediaAdCopyPersonalityImageURL = ""; // Extract image URL if it's set in the HTML

// Create a JavaScript object representing the Social Media Ad Copy personality
const socialMediaAdCopyPersonality = {
    name: socialMediaAdCopyPersonalityName,
    description: socialMediaAdCopyPersonalityDescription,
    prompt: socialMediaAdCopyPersonalityPrompt,
    image: socialMediaAdCopyPersonalityImageURL // Set this to the actual image URL if it's available in the HTML
};

// Call the insertPersonality function with the new Social Media Ad Copy personality object
insertPersonality(socialMediaAdCopyPersonality);

// Get the Movie Recommender personality HTML element
const movieRecommenderPersonalityElement = document.getElementById("movieRecommenderPersonality");

// Extract the necessary information
const movieRecommenderPersonalityName = movieRecommenderPersonalityElement.querySelector(".personality-title").innerText;
const movieRecommenderPersonalityDescription = movieRecommenderPersonalityElement.querySelector(".personality-description").innerText;
const movieRecommenderPersonalityPrompt = movieRecommenderPersonalityElement.querySelector(".personality-prompt").innerText;
const movieRecommenderPersonalityImageURL = ""; // Extract image URL if it's set in the HTML

// Create a JavaScript object representing the Movie Recommender personality
const movieRecommenderPersonality = {
    name: movieRecommenderPersonalityName,
    description: movieRecommenderPersonalityDescription,
    prompt: movieRecommenderPersonalityPrompt,
    image: movieRecommenderPersonalityImageURL // Set this to the actual image URL if it's available in the HTML
};

// Call the insertPersonality function with the new Movie Recommender personality object
insertPersonality(movieRecommenderPersonality);

// Get the Detailed Outline Generator personality HTML element
const detailedOutlineGeneratorPersonalityElement = document.getElementById("detailedOutlineGeneratorPersonality");

// Extract the necessary information
const detailedOutlineGeneratorPersonalityName = detailedOutlineGeneratorPersonalityElement.querySelector(".personality-title").innerText;
const detailedOutlineGeneratorPersonalityDescription = detailedOutlineGeneratorPersonalityElement.querySelector(".personality-description").innerText;
const detailedOutlineGeneratorPersonalityPrompt = detailedOutlineGeneratorPersonalityElement.querySelector(".personality-prompt").innerText;
const detailedOutlineGeneratorPersonalityImageURL = ""; // Extract image URL if it's set in the HTML

// Create a JavaScript object representing the Detailed Outline Generator personality
const detailedOutlineGeneratorPersonality = {
    name: detailedOutlineGeneratorPersonalityName,
    description: detailedOutlineGeneratorPersonalityDescription,
    prompt: detailedOutlineGeneratorPersonalityPrompt,
    image: detailedOutlineGeneratorPersonalityImageURL // Set this to the actual image URL if it's available in the HTML
};

// Call the insertPersonality function with the new Detailed Outline Generator personality object
insertPersonality(detailedOutlineGeneratorPersonality);

// Get the Sous-Chef personality HTML element
const sousChefPersonalityElement = document.getElementById("sousChefPersonality");

// Extract the necessary information
const sousChefPersonalityName = sousChefPersonalityElement.querySelector(".personality-title").innerText;
const sousChefPersonalityDescription = sousChefPersonalityElement.querySelector(".personality-description").innerText;
const sousChefPersonalityPrompt = sousChefPersonalityElement.querySelector(".personality-prompt").innerText;
const sousChefPersonalityImageURL = ""; // Extract image URL if it's set in the HTML

// Create a JavaScript object representing the Sous-Chef personality
const sousChefPersonality = {
    name: sousChefPersonalityName,
    description: sousChefPersonalityDescription,
    prompt: sousChefPersonalityPrompt,
    image: sousChefPersonalityImageURL // Set this to the actual image URL if it's available in the HTML
};

// Call the insertPersonality function with the new Sous-Chef personality object
insertPersonality(sousChefPersonality);

// Get the Grocery List Writer personality HTML element
const groceryListWriterPersonalityElement = document.getElementById("groceryListWriterPersonality");

// Extract the necessary information
const groceryListWriterPersonalityName = groceryListWriterPersonalityElement.querySelector(".personality-title").innerText;
const groceryListWriterPersonalityDescription = groceryListWriterPersonalityElement.querySelector(".personality-description").innerText;
const groceryListWriterPersonalityPrompt = groceryListWriterPersonalityElement.querySelector(".personality-prompt").innerText;
const groceryListWriterPersonalityImageURL = ""; // Extract image URL if it's set in the HTML

// Create a JavaScript object representing the Grocery List Writer personality
const groceryListWriterPersonality = {
    name: groceryListWriterPersonalityName,
    description: groceryListWriterPersonalityDescription,
    prompt: groceryListWriterPersonalityPrompt,
    image: groceryListWriterPersonalityImageURL // Set this to the actual image URL if it's available in the HTML
};

// Call the insertPersonality function with the new Grocery List Writer personality object
insertPersonality(groceryListWriterPersonality);

// Get the Brainstorming Tool personality HTML element
const brainstormingToolPersonalityElement = document.getElementById("brainstormingToolPersonality");

// Extract the necessary information
const brainstormingToolPersonalityName = brainstormingToolPersonalityElement.querySelector(".personality-title").innerText;
const brainstormingToolPersonalityDescription = brainstormingToolPersonalityElement.querySelector(".personality-description").innerText;
const brainstormingToolPersonalityPrompt = brainstormingToolPersonalityElement.querySelector(".personality-prompt").innerText;
const brainstormingToolPersonalityImageURL = ""; // Extract image URL if it's set in the HTML

// Create a JavaScript object representing the Brainstorming Tool personality
const brainstormingToolPersonality = {
    name: brainstormingToolPersonalityName,
    description: brainstormingToolPersonalityDescription,
    prompt: brainstormingToolPersonalityPrompt,
    image: brainstormingToolPersonalityImageURL // Set this to the actual image URL if it's available in the HTML
};

// Call the insertPersonality function with the new Brainstorming Tool personality object
insertPersonality(brainstormingToolPersonality);

// Get the Sound Prolific personality HTML element
const soundProlificPersonalityElement = document.getElementById("soundProlificPersonality");

// Extract the necessary information
const soundProlificPersonalityName = soundProlificPersonalityElement.querySelector(".personality-title").innerText;
const soundProlificPersonalityDescription = soundProlificPersonalityElement.querySelector(".personality-description").innerText;
const soundProlificPersonalityPrompt = soundProlificPersonalityElement.querySelector(".personality-prompt").innerText;
const soundProlificPersonalityImageURL = ""; // Extract image URL if it's set in the HTML

// Create a JavaScript object representing the Sound Prolific personality
const soundProlificPersonality = {
    name: soundProlificPersonalityName,
    description: soundProlificPersonalityDescription,
    prompt: soundProlificPersonalityPrompt,
    image: soundProlificPersonalityImageURL // Set this to the actual image URL if it's available in the HTML
};

// Call the insertPersonality function with the new Sound Prolific personality object
insertPersonality(soundProlificPersonality);

// Get the Essay Topic Generator personality HTML element
const essayTopicGeneratorPersonalityElement = document.getElementById("essayTopicGeneratorPersonality");

// Extract the necessary information
const essayTopicGeneratorPersonalityName = essayTopicGeneratorPersonalityElement.querySelector(".personality-title").innerText;
const essayTopicGeneratorPersonalityDescription = essayTopicGeneratorPersonalityElement.querySelector(".personality-description").innerText;
const essayTopicGeneratorPersonalityPrompt = essayTopicGeneratorPersonalityElement.querySelector(".personality-prompt").innerText;
const essayTopicGeneratorPersonalityImageURL = ""; // Extract image URL if it's set in the HTML

// Create a JavaScript object representing the Essay Topic Generator personality
const essayTopicGeneratorPersonality = {
    name: essayTopicGeneratorPersonalityName,
    description: essayTopicGeneratorPersonalityDescription,
    prompt: essayTopicGeneratorPersonalityPrompt,
    image: essayTopicGeneratorPersonalityImageURL // Set this to the actual image URL if it's available in the HTML
};

// Call the insertPersonality function with the new Essay Topic Generator personality object
insertPersonality(essayTopicGeneratorPersonality);

// Get the LinkedIn Post Creator personality HTML element
const linkedInPostCreatorPersonalityElement = document.getElementById("linkedInPostCreatorPersonality");

// Extract the necessary information
const linkedInPostCreatorPersonalityName = linkedInPostCreatorPersonalityElement.querySelector(".personality-title").innerText;
const linkedInPostCreatorPersonalityDescription = linkedInPostCreatorPersonalityElement.querySelector(".personality-description").innerText;
const linkedInPostCreatorPersonalityPrompt = linkedInPostCreatorPersonalityElement.querySelector(".personality-prompt").innerText;
const linkedInPostCreatorPersonalityImageURL = ""; // Extract image URL if it's set in the HTML

// Create a JavaScript object representing the LinkedIn Post Creator personality
const linkedInPostCreatorPersonality = {
    name: linkedInPostCreatorPersonalityName,
    description: linkedInPostCreatorPersonalityDescription,
    prompt: linkedInPostCreatorPersonalityPrompt,
    image: linkedInPostCreatorPersonalityImageURL // Set this to the actual image URL if it's available in the HTML
};

// Call the insertPersonality function with the new LinkedIn Post Creator personality object
insertPersonality(linkedInPostCreatorPersonality);

// Get the Paragraph Expander personality HTML element
const paragraphExpanderPersonalityElement = document.getElementById("paragraphExpanderPersonality");

// Extract the necessary information
const paragraphExpanderPersonalityName = paragraphExpanderPersonalityElement.querySelector(".personality-title").innerText;
const paragraphExpanderPersonalityDescription = paragraphExpanderPersonalityElement.querySelector(".personality-description").innerText;
const paragraphExpanderPersonalityPrompt = paragraphExpanderPersonalityElement.querySelector(".personality-prompt").innerText;
const paragraphExpanderPersonalityImageURL = ""; // Extract image URL if it's set in the HTML

// Create a JavaScript object representing the Paragraph Expander personality
const paragraphExpanderPersonality = {
    name: paragraphExpanderPersonalityName,
    description: paragraphExpanderPersonalityDescription,
    prompt: paragraphExpanderPersonalityPrompt,
    image: paragraphExpanderPersonalityImageURL // Set this to the actual image URL if it's available in the HTML
};

// Call the insertPersonality function with the new Paragraph Expander personality object
insertPersonality(paragraphExpanderPersonality);

// Get the Birthday Card Creator personality HTML element
const birthdayCardCreatorPersonalityElement = document.getElementById("birthdayCardCreatorPersonality");

// Extract the necessary information
const birthdayCardCreatorPersonalityName = birthdayCardCreatorPersonalityElement.querySelector(".personality-title").innerText;
const birthdayCardCreatorPersonalityDescription = birthdayCardCreatorPersonalityElement.querySelector(".personality-description").innerText;
const birthdayCardCreatorPersonalityPrompt = birthdayCardCreatorPersonalityElement.querySelector(".personality-prompt").innerText;
const birthdayCardCreatorPersonalityImageURL = ""; // Extract image URL if it's set in the HTML

// Create a JavaScript object representing the Birthday Card Creator personality
const birthdayCardCreatorPersonality = {
    name: birthdayCardCreatorPersonalityName,
    description: birthdayCardCreatorPersonalityDescription,
    prompt: birthdayCardCreatorPersonalityPrompt,
    image: birthdayCardCreatorPersonalityImageURL // Set this to the actual image URL if it's available in the HTML
};

// Call the insertPersonality function with the new Birthday Card Creator personality object
insertPersonality(birthdayCardCreatorPersonality);

// Get the Question Generator personality HTML element
const questionGeneratorPersonalityElement = document.getElementById("questionGeneratorPersonality");

// Extract the necessary information
const questionGeneratorPersonalityName = questionGeneratorPersonalityElement.querySelector(".personality-title").innerText;
const questionGeneratorPersonalityDescription = questionGeneratorPersonalityElement.querySelector(".personality-description").innerText;
const questionGeneratorPersonalityPrompt = questionGeneratorPersonalityElement.querySelector(".personality-prompt").innerText;
const questionGeneratorPersonalityImageURL = ""; // Extract image URL if it's set in the HTML

// Create a JavaScript object representing the Question Generator personality
const questionGeneratorPersonality = {
    name: questionGeneratorPersonalityName,
    description: questionGeneratorPersonalityDescription,
    prompt: questionGeneratorPersonalityPrompt,
    image: questionGeneratorPersonalityImageURL // Set this to the actual image URL if it's available in the HTML
};

// Call the insertPersonality function with the new Question Generator personality object
insertPersonality(questionGeneratorPersonality);

// Get the TikTok Script Writer personality HTML element
const tikTokScriptWriterPersonalityElement = document.getElementById("tikTokScriptWriterPersonality");

// Extract the necessary information
const tikTokScriptWriterPersonalityName = tikTokScriptWriterPersonalityElement.querySelector(".personality-title").innerText;
const tikTokScriptWriterPersonalityDescription = tikTokScriptWriterPersonalityElement.querySelector(".personality-description").innerText;
const tikTokScriptWriterPersonalityPrompt = tikTokScriptWriterPersonalityElement.querySelector(".personality-prompt").innerText;
const tikTokScriptWriterPersonalityImageURL = ""; // Extract image URL if it's set in the HTML

// Create a JavaScript object representing the TikTok Script Writer personality
const tikTokScriptWriterPersonality = {
    name: tikTokScriptWriterPersonalityName,
    description: tikTokScriptWriterPersonalityDescription,
    prompt: tikTokScriptWriterPersonalityPrompt,
    image: tikTokScriptWriterPersonalityImageURL // Set this to the actual image URL if it's available in the HTML
};

// Call the insertPersonality function with the new TikTok Script Writer personality object
insertPersonality(tikTokScriptWriterPersonality);

// Get the Email Subject Line Generator personality HTML element
const emailSubjectLineGeneratorPersonalityElement = document.getElementById("emailSubjectLineGeneratorPersonality");

// Extract the necessary information
const emailSubjectLineGeneratorPersonalityName = emailSubjectLineGeneratorPersonalityElement.querySelector(".personality-title").innerText;
const emailSubjectLineGeneratorPersonalityDescription = emailSubjectLineGeneratorPersonalityElement.querySelector(".personality-description").innerText;
const emailSubjectLineGeneratorPersonalityPrompt = emailSubjectLineGeneratorPersonalityElement.querySelector(".personality-prompt").innerText;
const emailSubjectLineGeneratorPersonalityImageURL = ""; // Extract image URL if it's set in the HTML

// Create a JavaScript object representing the Email Subject Line Generator personality
const emailSubjectLineGeneratorPersonality = {
    name: emailSubjectLineGeneratorPersonalityName,
    description: emailSubjectLineGeneratorPersonalityDescription,
    prompt: emailSubjectLineGeneratorPersonalityPrompt,
    image: emailSubjectLineGeneratorPersonalityImageURL // Set this to the actual image URL if it's available in the HTML
};

// Call the insertPersonality function with the new Email Subject Line Generator personality object
insertPersonality(emailSubjectLineGeneratorPersonality);

// Get the Facebook Post Generator personality HTML element
const facebookPostGeneratorPersonalityElement = document.getElementById("facebookPostGeneratorPersonality");

// Extract the necessary information
const facebookPostGeneratorPersonalityName = facebookPostGeneratorPersonalityElement.querySelector(".personality-title").innerText;
const facebookPostGeneratorPersonalityDescription = facebookPostGeneratorPersonalityElement.querySelector(".personality-description").innerText;
const facebookPostGeneratorPersonalityPrompt = facebookPostGeneratorPersonalityElement.querySelector(".personality-prompt").innerText;
const facebookPostGeneratorPersonalityImageURL = ""; // Extract image URL if it's set in the HTML

// Create a JavaScript object representing the Facebook Post Generator personality
const facebookPostGeneratorPersonality = {
    name: facebookPostGeneratorPersonalityName,
    description: facebookPostGeneratorPersonalityDescription,
    prompt: facebookPostGeneratorPersonalityPrompt,
    image: facebookPostGeneratorPersonalityImageURL // Set this to the actual image URL if it's available in the HTML
};

// Call the insertPersonality function with the new Facebook Post Generator personality object
insertPersonality(facebookPostGeneratorPersonality);

// Get the Essay Title Generator personality HTML element
const essayTitleGeneratorPersonalityElement = document.getElementById("essayTitleGeneratorPersonality");

// Extract the necessary information
const essayTitleGeneratorPersonalityName = essayTitleGeneratorPersonalityElement.querySelector(".personality-title").innerText;
const essayTitleGeneratorPersonalityDescription = essayTitleGeneratorPersonalityElement.querySelector(".personality-description").innerText;
const essayTitleGeneratorPersonalityPrompt = essayTitleGeneratorPersonalityElement.querySelector(".personality-prompt").innerText;
const essayTitleGeneratorPersonalityImageURL = ""; // Extract image URL if it's set in the HTML

// Create a JavaScript object representing the Essay Title Generator personality
const essayTitleGeneratorPersonality = {
    name: essayTitleGeneratorPersonalityName,
    description: essayTitleGeneratorPersonalityDescription,
    prompt: essayTitleGeneratorPersonalityPrompt,
    image: essayTitleGeneratorPersonalityImageURL // Set this to the actual image URL if it's available in the HTML
};

// Call the insertPersonality function with the new Essay Title Generator personality object
insertPersonality(essayTitleGeneratorPersonality);

// Get the English Question Analyzer personality HTML element
const englishQuestionAnalyzerPersonalityElement = document.getElementById("englishQuestionAnalyzerPersonality");

// Extract the necessary information
const englishQuestionAnalyzerPersonalityName = englishQuestionAnalyzerPersonalityElement.querySelector(".personality-title").innerText;
const englishQuestionAnalyzerPersonalityDescription = englishQuestionAnalyzerPersonalityElement.querySelector(".personality-description").innerText;
const englishQuestionAnalyzerPersonalityPrompt = englishQuestionAnalyzerPersonalityElement.querySelector(".personality-prompt").innerText;
const englishQuestionAnalyzerPersonalityImageURL = ""; // Extract image URL if it's set in the HTML

// Create a JavaScript object representing the English Question Analyzer personality
const englishQuestionAnalyzerPersonality = {
    name: englishQuestionAnalyzerPersonalityName,
    description: englishQuestionAnalyzerPersonalityDescription,
    prompt: englishQuestionAnalyzerPersonalityPrompt,
    image: englishQuestionAnalyzerPersonalityImageURL // Set this to the actual image URL if it's available in the HTML
};

// Call the insertPersonality function with the new English Question Analyzer personality object
insertPersonality(englishQuestionAnalyzerPersonality);

// Get the Universal Translator personality HTML element
const universalTranslatorPersonalityElement = document.getElementById("universalTranslatorPersonality");

// Extract the necessary information
const universalTranslatorPersonalityName = universalTranslatorPersonalityElement.querySelector(".personality-title").innerText;
const universalTranslatorPersonalityDescription = universalTranslatorPersonalityElement.querySelector(".personality-description").innerText;
const universalTranslatorPersonalityPrompt = universalTranslatorPersonalityElement.querySelector(".personality-prompt").innerText;
const universalTranslatorPersonalityImageURL = ""; // Extract image URL if it's set in the HTML

// Create a JavaScript object representing the Universal Translator personality
const universalTranslatorPersonality = {
    name: universalTranslatorPersonalityName,
    description: universalTranslatorPersonalityDescription,
    prompt: universalTranslatorPersonalityPrompt,
    image: universalTranslatorPersonalityImageURL // Set this to the actual image URL if it's available in the HTML
};

// Call the insertPersonality function with the new Universal Translator personality object
insertPersonality(universalTranslatorPersonality);

// Get the Flexible Autowrite with Style personality HTML element
const flexibleAutowriteWithStylePersonalityElement = document.getElementById("flexibleAutowriteWithStylePersonality");

// Extract the necessary information
const flexibleAutowriteWithStylePersonalityName = flexibleAutowriteWithStylePersonalityElement.querySelector(".personality-title").innerText;
const flexibleAutowriteWithStylePersonalityDescription = flexibleAutowriteWithStylePersonalityElement.querySelector(".personality-description").innerText;
const flexibleAutowriteWithStylePersonalityPrompt = flexibleAutowriteWithStylePersonalityElement.querySelector(".personality-prompt").innerText;
const flexibleAutowriteWithStylePersonalityImageURL = ""; // Extract image URL if it's set in the HTML

// Create a JavaScript object representing the Flexible Autowrite with Style personality
const flexibleAutowriteWithStylePersonality = {
    name: flexibleAutowriteWithStylePersonalityName,
    description: flexibleAutowriteWithStylePersonalityDescription,
    prompt: flexibleAutowriteWithStylePersonalityPrompt,
    image: flexibleAutowriteWithStylePersonalityImageURL // Set this to the actual image URL if it's available in the HTML
};

// Call the insertPersonality function with the new Flexible Autowrite with Style personality object
insertPersonality(flexibleAutowriteWithStylePersonality);

// Get the Ad Copy Generator personality HTML element
const adCopyGeneratorPersonalityElement = document.getElementById("adCopyGeneratorPersonality");

// Extract the necessary information
const adCopyGeneratorPersonalityName = adCopyGeneratorPersonalityElement.querySelector(".personality-title").innerText;
const adCopyGeneratorPersonalityDescription = adCopyGeneratorPersonalityElement.querySelector(".personality-description").innerText;
const adCopyGeneratorPersonalityPrompt = adCopyGeneratorPersonalityElement.querySelector(".personality-prompt").innerText;
const adCopyGeneratorPersonalityImageURL = ""; // Extract image URL if it's set in the HTML

// Create a JavaScript object representing the Ad Copy Generator personality
const adCopyGeneratorPersonality = {
    name: adCopyGeneratorPersonalityName,
    description: adCopyGeneratorPersonalityDescription,
    prompt: adCopyGeneratorPersonalityPrompt,
    image: adCopyGeneratorPersonalityImageURL // Set this to the actual image URL if it's available in the HTML
};

// Call the insertPersonality function with the new Ad Copy Generator personality object
insertPersonality(adCopyGeneratorPersonality);

// Get the Instagram Caption Generator personality HTML element
const instagramCaptionGeneratorPersonalityElement = document.getElementById("instagramCaptionGeneratorPersonality");

// Extract the necessary information
const instagramCaptionGeneratorPersonalityName = instagramCaptionGeneratorPersonalityElement.querySelector(".personality-title").innerText;
const instagramCaptionGeneratorPersonalityDescription = instagramCaptionGeneratorPersonalityElement.querySelector(".personality-description").innerText;
const instagramCaptionGeneratorPersonalityPrompt = instagramCaptionGeneratorPersonalityElement.querySelector(".personality-prompt").innerText;
const instagramCaptionGeneratorPersonalityImageURL = ""; // Extract image URL if it's set in the HTML

// Create a JavaScript object representing the Instagram Caption Generator personality
const instagramCaptionGeneratorPersonality = {
    name: instagramCaptionGeneratorPersonalityName,
    description: instagramCaptionGeneratorPersonalityDescription,
    prompt: instagramCaptionGeneratorPersonalityPrompt,
    image: instagramCaptionGeneratorPersonalityImageURL // Set this to the actual image URL if it's available in the HTML
};

// Call the insertPersonality function with the new Instagram Caption Generator personality object
insertPersonality(instagramCaptionGeneratorPersonality);

// Get the Flexible Press Release Generator personality HTML element
const flexiblePressReleaseGeneratorPersonalityElement = document.getElementById("flexiblePressReleaseGeneratorPersonality");

// Extract the necessary information
const flexiblePressReleaseGeneratorPersonalityName = flexiblePressReleaseGeneratorPersonalityElement.querySelector(".personality-title").innerText;
const flexiblePressReleaseGeneratorPersonalityDescription = flexiblePressReleaseGeneratorPersonalityElement.querySelector(".personality-description").innerText;
const flexiblePressReleaseGeneratorPersonalityPrompt = flexiblePressReleaseGeneratorPersonalityElement.querySelector(".personality-prompt").innerText;
const flexiblePressReleaseGeneratorPersonalityImageURL = ""; // Extract image URL if it's set in the HTML

// Create a JavaScript object representing the Flexible Press Release Generator personality
const flexiblePressReleaseGeneratorPersonality = {
    name: flexiblePressReleaseGeneratorPersonalityName,
    description: flexiblePressReleaseGeneratorPersonalityDescription,
    prompt: flexiblePressReleaseGeneratorPersonalityPrompt,
    image: flexiblePressReleaseGeneratorPersonalityImageURL // Set this to the actual image URL if it's available in the HTML
};

// Call the insertPersonality function with the new Flexible Press Release Generator personality object
insertPersonality(flexiblePressReleaseGeneratorPersonality);

// Get the Discussion Post Commenter personality HTML element
const discussionPostCommenterPersonalityElement = document.getElementById("discussionPostCommenterPersonality");

// Extract the necessary information
const discussionPostCommenterPersonalityName = discussionPostCommenterPersonalityElement.querySelector(".personality-title").innerText;
const discussionPostCommenterPersonalityDescription = discussionPostCommenterPersonalityElement.querySelector(".personality-description").innerText;
const discussionPostCommenterPersonalityPrompt = discussionPostCommenterPersonalityElement.querySelector(".personality-prompt").innerText;
const discussionPostCommenterPersonalityImageURL = ""; // Extract image URL if it's set in the HTML

// Create a JavaScript object representing the Discussion Post Commenter personality
const discussionPostCommenterPersonality = {
    name: discussionPostCommenterPersonalityName,
    description: discussionPostCommenterPersonalityDescription,
    prompt: discussionPostCommenterPersonalityPrompt,
    image: discussionPostCommenterPersonalityImageURL // Set this to the actual image URL if it's available in the HTML
};

// Call the insertPersonality function with the new Discussion Post Commenter personality object
insertPersonality(discussionPostCommenterPersonality);

// Get the Listicle Subheadings Generator personality HTML element
const listicleSubheadingsGeneratorPersonalityElement = document.getElementById("listicleSubheadingsGeneratorPersonality");

// Extract the necessary information
const listicleSubheadingsGeneratorPersonalityName = listicleSubheadingsGeneratorPersonalityElement.querySelector(".personality-title").innerText;
const listicleSubheadingsGeneratorPersonalityDescription = listicleSubheadingsGeneratorPersonalityElement.querySelector(".personality-description").innerText;
const listicleSubheadingsGeneratorPersonalityPrompt = listicleSubheadingsGeneratorPersonalityElement.querySelector(".personality-prompt").innerText;
const listicleSubheadingsGeneratorPersonalityImageURL = ""; // Extract image URL if it's set in the HTML

// Create a JavaScript object representing the Listicle Subheadings Generator personality
const listicleSubheadingsGeneratorPersonality = {
    name: listicleSubheadingsGeneratorPersonalityName,
    description: listicleSubheadingsGeneratorPersonalityDescription,
    prompt: listicleSubheadingsGeneratorPersonalityPrompt,
    image: listicleSubheadingsGeneratorPersonalityImageURL // Set this to the actual image URL if it's available in the HTML
};

// Call the insertPersonality function with the new Listicle Subheadings Generator personality object
insertPersonality(listicleSubheadingsGeneratorPersonality);

// Get the Greeting Card Writer personality HTML element
const greetingCardWriterPersonalityElement = document.getElementById("greetingCardWriterPersonality");

// Extract the necessary information
const greetingCardWriterPersonalityName = greetingCardWriterPersonalityElement.querySelector(".personality-title").innerText;
const greetingCardWriterPersonalityDescription = greetingCardWriterPersonalityElement.querySelector(".personality-description").innerText;
const greetingCardWriterPersonalityPrompt = greetingCardWriterPersonalityElement.querySelector(".personality-prompt").innerText;
const greetingCardWriterPersonalityImageURL = ""; // Extract image URL if it's set in the HTML

// Create a JavaScript object representing the Greeting Card Writer personality
const greetingCardWriterPersonality = {
    name: greetingCardWriterPersonalityName,
    description: greetingCardWriterPersonalityDescription,
    prompt: greetingCardWriterPersonalityPrompt,
    image: greetingCardWriterPersonalityImageURL // Set this to the actual image URL if it's available in the HTML
};

// Call the insertPersonality function with the new Greeting Card Writer personality object
insertPersonality(greetingCardWriterPersonality);

// Get the Value Ladder Generator personality HTML element
const valueLadderGeneratorPersonalityElement = document.getElementById("valueLadderGeneratorPersonality");

// Extract the necessary information
const valueLadderGeneratorPersonalityName = valueLadderGeneratorPersonalityElement.querySelector(".personality-title").innerText;
const valueLadderGeneratorPersonalityDescription = valueLadderGeneratorPersonalityElement.querySelector(".personality-description").innerText;
const valueLadderGeneratorPersonalityPrompt = valueLadderGeneratorPersonalityElement.querySelector(".personality-prompt").innerText;
const valueLadderGeneratorPersonalityImageURL = ""; // Extract image URL if it's set in the HTML

// Create a JavaScript object representing the Value Ladder Generator personality
const valueLadderGeneratorPersonality = {
    name: valueLadderGeneratorPersonalityName,
    description: valueLadderGeneratorPersonalityDescription,
    prompt: valueLadderGeneratorPersonalityPrompt,
    image: valueLadderGeneratorPersonalityImageURL // Set this to the actual image URL if it's available in the HTML
};

// Call the insertPersonality function with the new Value Ladder Generator personality object
insertPersonality(valueLadderGeneratorPersonality);

// Get the Harry Potter Fanfiction Generator personality HTML element
const harryPotterFanfictionGeneratorPersonalityElement = document.getElementById("harryPotterFanfictionGeneratorPersonality");

// Extract the necessary information
const harryPotterFanfictionGeneratorPersonalityName = harryPotterFanfictionGeneratorPersonalityElement.querySelector(".personality-title").innerText;
const harryPotterFanfictionGeneratorPersonalityDescription = harryPotterFanfictionGeneratorPersonalityElement.querySelector(".personality-description").innerText;
const harryPotterFanfictionGeneratorPersonalityPrompt = harryPotterFanfictionGeneratorPersonalityElement.querySelector(".personality-prompt").innerText;
const harryPotterFanfictionGeneratorPersonalityImageURL = ""; // Extract image URL if it's set in the HTML

// Create a JavaScript object representing the Harry Potter Fanfiction Generator personality
const harryPotterFanfictionGeneratorPersonality = {
    name: harryPotterFanfictionGeneratorPersonalityName,
    description: harryPotterFanfictionGeneratorPersonalityDescription,
    prompt: harryPotterFanfictionGeneratorPersonalityPrompt,
    image: harryPotterFanfictionGeneratorPersonalityImageURL // Set this to the actual image URL if it's available in the HTML
};

// Call the insertPersonality function with the new Harry Potter Fanfiction Generator personality object
insertPersonality(harryPotterFanfictionGeneratorPersonality);

// Get the Write Next Paragraph personality HTML element
const writeNextParagraphPersonalityElement = document.getElementById("writeNextParagraphPersonality");

// Extract the necessary information
const writeNextParagraphPersonalityName = writeNextParagraphPersonalityElement.querySelector(".personality-title").innerText;
const writeNextParagraphPersonalityDescription = writeNextParagraphPersonalityElement.querySelector(".personality-description").innerText;
const writeNextParagraphPersonalityPrompt = writeNextParagraphPersonalityElement.querySelector(".personality-prompt").innerText;
const writeNextParagraphPersonalityImageURL = ""; // Extract image URL if it's set in the HTML

// Create a JavaScript object representing the Write Next Paragraph personality
const writeNextParagraphPersonality = {
    name: writeNextParagraphPersonalityName,
    description: writeNextParagraphPersonalityDescription,
    prompt: writeNextParagraphPersonalityPrompt,
    image: writeNextParagraphPersonalityImageURL // Set this to the actual image URL if it's available in the HTML
};

// Call the insertPersonality function with the new Write Next Paragraph personality object
insertPersonality(writeNextParagraphPersonality);

// Get the Generate Blog Intro personality HTML element
const generateBlogIntroPersonalityElement = document.getElementById("generateBlogIntroPersonality");

// Extract the necessary information
const generateBlogIntroPersonalityName = generateBlogIntroPersonalityElement.querySelector(".personality-title").innerText;
const generateBlogIntroPersonalityDescription = generateBlogIntroPersonalityElement.querySelector(".personality-description").innerText;
const generateBlogIntroPersonalityPrompt = generateBlogIntroPersonalityElement.querySelector(".personality-prompt").innerText;
const generateBlogIntroPersonalityImageURL = ""; // Extract image URL if it's set in the HTML

// Create a JavaScript object representing the Generate Blog Intro personality
const generateBlogIntroPersonality = {
    name: generateBlogIntroPersonalityName,
    description: generateBlogIntroPersonalityDescription,
    prompt: generateBlogIntroPersonalityPrompt,
    image: generateBlogIntroPersonalityImageURL // Set this to the actual image URL if it's available in the HTML
};

// Call the insertPersonality function with the new Generate Blog Intro personality object
insertPersonality(generateBlogIntroPersonality);

// Get the Technical Translator personality HTML element
const technicalTranslatorPersonalityElement = document.getElementById("technicalTranslatorPersonality");

// Extract the necessary information
const technicalTranslatorPersonalityName = technicalTranslatorPersonalityElement.querySelector(".personality-title").innerText;
const technicalTranslatorPersonalityDescription = technicalTranslatorPersonalityElement.querySelector(".personality-description").innerText;
const technicalTranslatorPersonalityPrompt = technicalTranslatorPersonalityElement.querySelector(".personality-prompt").innerText;
const technicalTranslatorPersonalityImageURL = ""; // Extract image URL if it's set in the HTML

// Create a JavaScript object representing the Technical Translator personality
const technicalTranslatorPersonality = {
    name: technicalTranslatorPersonalityName,
    description: technicalTranslatorPersonalityDescription,
    prompt: technicalTranslatorPersonalityPrompt,
    image: technicalTranslatorPersonalityImageURL // Set this to the actual image URL if it's available in the HTML
};

// Call the insertPersonality function with the new Technical Translator personality object
insertPersonality(technicalTranslatorPersonality);

// Get the SEO-friendly Blog Post Writer personality HTML element
const seoFriendlyBlogPostWriterPersonalityElement = document.getElementById("seoFriendlyBlogPostWriterPersonality");

// Extract the necessary information
const seoFriendlyBlogPostWriterPersonalityName = seoFriendlyBlogPostWriterPersonalityElement.querySelector(".personality-title").innerText;
const seoFriendlyBlogPostWriterPersonalityDescription = seoFriendlyBlogPostWriterPersonalityElement.querySelector(".personality-description").innerText;
const seoFriendlyBlogPostWriterPersonalityPrompt = seoFriendlyBlogPostWriterPersonalityElement.querySelector(".personality-prompt").innerText;
const seoFriendlyBlogPostWriterPersonalityImageURL = ""; // Extract image URL if it's set in the HTML

// Create a JavaScript object representing the SEO-friendly Blog Post Writer personality
const seoFriendlyBlogPostWriterPersonality = {
    name: seoFriendlyBlogPostWriterPersonalityName,
    description: seoFriendlyBlogPostWriterPersonalityDescription,
    prompt: seoFriendlyBlogPostWriterPersonalityPrompt,
    image: seoFriendlyBlogPostWriterPersonalityImageURL // Set this to the actual image URL if it's available in the HTML
};

// Call the insertPersonality function with the new SEO-friendly Blog Post Writer personality object
insertPersonality(seoFriendlyBlogPostWriterPersonality);

// Get the Research Assistant personality HTML element
const researchAssistantPersonalityElement = document.getElementById("researchAssistantPersonality");

// Extract the necessary information
const researchAssistantPersonalityName = researchAssistantPersonalityElement.querySelector(".personality-title").innerText;
const researchAssistantPersonalityDescription = researchAssistantPersonalityElement.querySelector(".personality-description").innerText;
const researchAssistantPersonalityPrompt = researchAssistantPersonalityElement.querySelector(".personality-prompt").innerText;
const researchAssistantPersonalityImageURL = ""; // Extract image URL if it's set in the HTML

// Create a JavaScript object representing the Research Assistant personality
const researchAssistantPersonality = {
    name: researchAssistantPersonalityName,
    description: researchAssistantPersonalityDescription,
    prompt: researchAssistantPersonalityPrompt,
    image: researchAssistantPersonalityImageURL // Set this to the actual image URL if it's available in the HTML
};

// Call the insertPersonality function with the new Research Assistant personality object
insertPersonality(researchAssistantPersonality);

// Get the Startup Idea Generator personality HTML element
const startupIdeaGeneratorPersonalityElement = document.getElementById("startupIdeaGeneratorPersonality");

// Extract the necessary information
const startupIdeaGeneratorPersonalityName = startupIdeaGeneratorPersonalityElement.querySelector(".personality-title").innerText;
const startupIdeaGeneratorPersonalityDescription = startupIdeaGeneratorPersonalityElement.querySelector(".personality-description").innerText;
const startupIdeaGeneratorPersonalityPrompt = startupIdeaGeneratorPersonalityElement.querySelector(".personality-prompt").innerText;
const startupIdeaGeneratorPersonalityImageURL = ""; // Extract image URL if it's set in the HTML

// Create a JavaScript object representing the Startup Idea Generator personality
const startupIdeaGeneratorPersonality = {
    name: startupIdeaGeneratorPersonalityName,
    description: startupIdeaGeneratorPersonalityDescription,
    prompt: startupIdeaGeneratorPersonalityPrompt,
    image: startupIdeaGeneratorPersonalityImageURL // Set this to the actual image URL if it's available in the HTML
};

// Call the insertPersonality function with the new Startup Idea Generator personality object
insertPersonality(startupIdeaGeneratorPersonality);

// Get the Marketing Email Generator personality HTML element
const marketingEmailGeneratorPersonalityElement = document.getElementById("marketingEmailGeneratorPersonality");

// Extract the necessary information
const marketingEmailGeneratorPersonalityName = marketingEmailGeneratorPersonalityElement.querySelector(".personality-title").innerText;
const marketingEmailGeneratorPersonalityDescription = marketingEmailGeneratorPersonalityElement.querySelector(".personality-description").innerText;
const marketingEmailGeneratorPersonalityPrompt = marketingEmailGeneratorPersonalityElement.querySelector(".personality-prompt").innerText;
const marketingEmailGeneratorPersonalityImageURL = ""; // Extract image URL if it's set in the HTML

// Create a JavaScript object representing the Marketing Email Generator personality
const marketingEmailGeneratorPersonality = {
    name: marketingEmailGeneratorPersonalityName,
    description: marketingEmailGeneratorPersonalityDescription,
    prompt: marketingEmailGeneratorPersonalityPrompt,
    image: marketingEmailGeneratorPersonalityImageURL // Set this to the actual image URL if it's available in the HTML
};

// Call the insertPersonality function with the new Marketing Email Generator personality object
insertPersonality(marketingEmailGeneratorPersonality);

// Get the Restaurant Meal Picker personality HTML element
const restaurantMealPickerPersonalityElement = document.getElementById("restaurantMealPickerPersonality");

// Extract the necessary information
const restaurantMealPickerPersonalityName = restaurantMealPickerPersonalityElement.querySelector(".personality-title").innerText;
const restaurantMealPickerPersonalityDescription = restaurantMealPickerPersonalityElement.querySelector(".personality-description").innerText;
const restaurantMealPickerPersonalityPrompt = restaurantMealPickerPersonalityElement.querySelector(".personality-prompt").innerText;
const restaurantMealPickerPersonalityImageURL = ""; // Extract image URL if it's set in the HTML

// Create a JavaScript object representing the Restaurant Meal Picker personality
const restaurantMealPickerPersonality = {
    name: restaurantMealPickerPersonalityName,
    description: restaurantMealPickerPersonalityDescription,
    prompt: restaurantMealPickerPersonalityPrompt,
    image: restaurantMealPickerPersonalityImageURL // Set this to the actual image URL if it's available in the HTML
};

// Call the insertPersonality function with the new Restaurant Meal Picker personality object
insertPersonality(restaurantMealPickerPersonality);

// Get the Company Name Generator personality HTML element
const companyNameGeneratorPersonalityElement = document.getElementById("companyNameGeneratorPersonality");

// Extract the necessary information
const companyNameGeneratorPersonalityName = companyNameGeneratorPersonalityElement.querySelector(".personality-title").innerText;
const companyNameGeneratorPersonalityDescription = companyNameGeneratorPersonalityElement.querySelector(".personality-description").innerText;
const companyNameGeneratorPersonalityPrompt = companyNameGeneratorPersonalityElement.querySelector(".personality-prompt").innerText;
const companyNameGeneratorPersonalityImageURL = ""; // Extract image URL if it's set in the HTML

// Create a JavaScript object representing the Company Name Generator personality
const companyNameGeneratorPersonality = {
    name: companyNameGeneratorPersonalityName,
    description: companyNameGeneratorPersonalityDescription,
    prompt: companyNameGeneratorPersonalityPrompt,
    image: companyNameGeneratorPersonalityImageURL // Set this to the actual image URL if it's available in the HTML
};

// Call the insertPersonality function with the new Company Name Generator personality object
insertPersonality(companyNameGeneratorPersonality);

// Get the Letter of Request Generator personality HTML element
const letterOfRequestGeneratorPersonalityElement = document.getElementById("letterOfRequestGeneratorPersonality");

// Extract the necessary information
const letterOfRequestGeneratorPersonalityName = letterOfRequestGeneratorPersonalityElement.querySelector(".personality-title").innerText;
const letterOfRequestGeneratorPersonalityDescription = letterOfRequestGeneratorPersonalityElement.querySelector(".personality-description").innerText;
const letterOfRequestGeneratorPersonalityPrompt = letterOfRequestGeneratorPersonalityElement.querySelector(".personality-prompt").innerText;
const letterOfRequestGeneratorPersonalityImageURL = ""; // Extract image URL if it's set in the HTML

// Create a JavaScript object representing the Letter of Request Generator personality
const letterOfRequestGeneratorPersonality = {
    name: letterOfRequestGeneratorPersonalityName,
    description: letterOfRequestGeneratorPersonalityDescription,
    prompt: letterOfRequestGeneratorPersonalityPrompt,
    image: letterOfRequestGeneratorPersonalityImageURL // Set this to the actual image URL if it's available in the HTML
};

// Call the insertPersonality function with the new Letter of Request Generator personality object
insertPersonality(letterOfRequestGeneratorPersonality);

// Get the Graduation Card Generator personality HTML element
const graduationCardGeneratorPersonalityElement = document.getElementById("graduationCardGeneratorPersonality");

// Extract the necessary information
const graduationCardGeneratorPersonalityName = graduationCardGeneratorPersonalityElement.querySelector(".personality-title").innerText;
const graduationCardGeneratorPersonalityDescription = graduationCardGeneratorPersonalityElement.querySelector(".personality-description").innerText;
const graduationCardGeneratorPersonalityPrompt = graduationCardGeneratorPersonalityElement.querySelector(".personality-prompt").innerText;
const graduationCardGeneratorPersonalityImageURL = ""; // Extract image URL if it's set in the HTML

// Create a JavaScript object representing the Graduation Card Generator personality
const graduationCardGeneratorPersonality = {
    name: graduationCardGeneratorPersonalityName,
    description: graduationCardGeneratorPersonalityDescription,
    prompt: graduationCardGeneratorPersonalityPrompt,
    image: graduationCardGeneratorPersonalityImageURL // Set this to the actual image URL if it's available in the HTML
};

// Call the insertPersonality function with the new Graduation Card Generator personality object
insertPersonality(graduationCardGeneratorPersonality);

// Get the Writing Improver personality HTML element
const writingImproverPersonalityElement = document.getElementById("writingImproverPersonality");

// Extract the necessary information
const writingImproverPersonalityName = writingImproverPersonalityElement.querySelector(".personality-title").innerText;
const writingImproverPersonalityDescription = writingImproverPersonalityElement.querySelector(".personality-description").innerText;
const writingImproverPersonalityPrompt = writingImproverPersonalityElement.querySelector(".personality-prompt").innerText;
const writingImproverPersonalityImageURL = ""; // Extract image URL if it's set in the HTML

// Create a JavaScript object representing the Writing Improver personality
const writingImproverPersonality = {
    name: writingImproverPersonalityName,
    description: writingImproverPersonalityDescription,
    prompt: writingImproverPersonalityPrompt,
    image: writingImproverPersonalityImageURL // Set this to the actual image URL if it's available in the HTML
};

// Call the insertPersonality function with the new Writing Improver personality object
insertPersonality(writingImproverPersonality);

// Get the Anniversary Card Maker personality HTML element
const anniversaryCardMakerPersonalityElement = document.getElementById("anniversaryCardMakerPersonality");

// Extract the necessary information
const anniversaryCardMakerPersonalityName = anniversaryCardMakerPersonalityElement.querySelector(".personality-title").innerText;
const anniversaryCardMakerPersonalityDescription = anniversaryCardMakerPersonalityElement.querySelector(".personality-description").innerText;
const anniversaryCardMakerPersonalityPrompt = anniversaryCardMakerPersonalityElement.querySelector(".personality-prompt").innerText;
const anniversaryCardMakerPersonalityImageURL = ""; // Extract image URL if it's set in the HTML

// Create a JavaScript object representing the Anniversary Card Maker personality
const anniversaryCardMakerPersonality = {
    name: anniversaryCardMakerPersonalityName,
    description: anniversaryCardMakerPersonalityDescription,
    prompt: anniversaryCardMakerPersonalityPrompt,
    image: anniversaryCardMakerPersonalityImageURL // Set this to the actual image URL if it's available in the HTML
};

// Call the insertPersonality function with the new Anniversary Card Maker personality object
insertPersonality(anniversaryCardMakerPersonality);

// Get the Sales Script Creator personality HTML element
const salesScriptCreatorPersonalityElement = document.getElementById("salesScriptCreatorPersonality");

// Extract the necessary information
const salesScriptCreatorPersonalityName = salesScriptCreatorPersonalityElement.querySelector(".personality-title").innerText;
const salesScriptCreatorPersonalityDescription = salesScriptCreatorPersonalityElement.querySelector(".personality-description").innerText;
const salesScriptCreatorPersonalityPrompt = salesScriptCreatorPersonalityElement.querySelector(".personality-prompt").innerText;
const salesScriptCreatorPersonalityImageURL = ""; // Extract image URL if it's set in the HTML

// Create a JavaScript object representing the Sales Script Creator personality
const salesScriptCreatorPersonality = {
    name: salesScriptCreatorPersonalityName,
    description: salesScriptCreatorPersonalityDescription,
    prompt: salesScriptCreatorPersonalityPrompt,
   

 image: salesScriptCreatorPersonalityImageURL // Set this to the actual image URL if it's available in the HTML
};

// Call the insertPersonality function with the new Sales Script Creator personality object
insertPersonality(salesScriptCreatorPersonality);

// Get the Short Manuscript Creator personality HTML element
const shortManuscriptCreatorPersonalityElement = document.getElementById("shortManuscriptCreatorPersonality");

// Extract the necessary information
const shortManuscriptCreatorPersonalityName = shortManuscriptCreatorPersonalityElement.querySelector(".personality-title").innerText;
const shortManuscriptCreatorPersonalityDescription = shortManuscriptCreatorPersonalityElement.querySelector(".personality-description").innerText;
const shortManuscriptCreatorPersonalityPrompt = shortManuscriptCreatorPersonalityElement.querySelector(".personality-prompt").innerText;
const shortManuscriptCreatorPersonalityImageURL = ""; // Extract image URL if it's set in the HTML

// Create a JavaScript object representing the Short Manuscript Creator personality
const shortManuscriptCreatorPersonality = {
    name: shortManuscriptCreatorPersonalityName,
    description: shortManuscriptCreatorPersonalityDescription,
    prompt: shortManuscriptCreatorPersonalityPrompt,
    image: shortManuscriptCreatorPersonalityImageURL // Set this to the actual image URL if it's available in the HTML
};

// Call the insertPersonality function with the new Short Manuscript Creator personality object
insertPersonality(shortManuscriptCreatorPersonality);

// Get the Father's Day Card Creator personality HTML element
const fathersDayCardCreatorPersonalityElement = document.getElementById("fathersDayCardCreatorPersonality");

// Extract the necessary information
const fathersDayCardCreatorPersonalityName = fathersDayCardCreatorPersonalityElement.querySelector(".personality-title").innerText;
const fathersDayCardCreatorPersonalityDescription = fathersDayCardCreatorPersonalityElement.querySelector(".personality-description").innerText;
const fathersDayCardCreatorPersonalityPrompt = fathersDayCardCreatorPersonalityElement.querySelector(".personality-prompt").innerText;
const fathersDayCardCreatorPersonalityImageURL = ""; // Extract image URL if it's set in the HTML

// Create a JavaScript object representing the Father's Day Card Creator personality
const fathersDayCardCreatorPersonality = {
    name: fathersDayCardCreatorPersonalityName,
    description: fathersDayCardCreatorPersonalityDescription,
    prompt: fathersDayCardCreatorPersonalityPrompt,
    image: fathersDayCardCreatorPersonalityImageURL // Set this to the actual image URL if it's available in the HTML
};

// Call the insertPersonality function with the new Father's Day Card Creator personality object
insertPersonality(fathersDayCardCreatorPersonality);

// Get the Caption Creator personality HTML element
const captionCreatorPersonalityElement = document.getElementById("captionCreatorPersonality");

// Extract the necessary information
const captionCreatorPersonalityName = captionCreatorPersonalityElement.querySelector(".personality-title").innerText;
const captionCreatorPersonalityDescription = captionCreatorPersonalityElement.querySelector(".personality-description").innerText;
const captionCreatorPersonalityPrompt = captionCreatorPersonalityElement.querySelector(".personality-prompt").innerText;
const captionCreatorPersonalityImageURL = ""; // Extract image URL if it's set in the HTML

// Create a JavaScript object representing the Caption Creator personality
const captionCreatorPersonality = {
    name: captionCreatorPersonalityName,
    description: captionCreatorPersonalityDescription,
    prompt: captionCreatorPersonalityPrompt,
    image: captionCreatorPersonalityImageURL // Set this to the actual image URL if it's available in the HTML
};

// Call the insertPersonality function with the new Caption Creator personality object
insertPersonality(captionCreatorPersonality);

// Get the Article Writer personality HTML element
const articleWriterPersonalityElement = document.getElementById("articleWriterPersonality");

// Extract the necessary information
const articleWriterPersonalityName = articleWriterPersonalityElement.querySelector(".personality-title").innerText;
const articleWriterPersonalityDescription = articleWriterPersonalityElement.querySelector(".personality-description").innerText;
const articleWriterPersonalityPrompt = articleWriterPersonalityElement.querySelector(".personality-prompt").innerText;
const articleWriterPersonalityImageURL = ""; // Extract image URL if it's set in the HTML

// Create a JavaScript object representing the Article Writer personality
const articleWriterPersonality = {
    name: articleWriterPersonalityName,
    description: articleWriterPersonalityDescription,
    prompt: articleWriterPersonalityPrompt,
    image: articleWriterPersonalityImageURL // Set this to the actual image URL if it's available in the HTML
};

// Call the insertPersonality function with the new Article Writer personality object
insertPersonality(articleWriterPersonality);

// Get the Answer Emails personality HTML element
const answerEmailsPersonalityElement = document.getElementById("answerEmailsPersonality");

// Extract the necessary information
const answerEmailsPersonalityName = answerEmailsPersonalityElement.querySelector(".personality-title").innerText;
const answerEmailsPersonalityDescription = answerEmailsPersonalityElement.querySelector(".personality-description").innerText;
const answerEmailsPersonalityPrompt = answerEmailsPersonalityElement.querySelector(".personality-prompt").innerText;
const answerEmailsPersonalityImageURL = ""; // Extract image URL if it's set in the HTML

// Create a JavaScript object representing the Answer Emails personality
const answerEmailsPersonality = {
    name: answerEmailsPersonalityName,
    description: answerEmailsPersonalityDescription,
    prompt: answerEmailsPersonalityPrompt,
    image: answerEmailsPersonalityImageURL // Set this to the actual image URL if it's available in the HTML
};

// Call the insertPersonality function with the new Answer Emails personality object
insertPersonality(answerEmailsPersonality);

// Get the Wedding Card Ideas personality HTML element
const weddingCardIdeasPersonalityElement = document.getElementById("weddingCardIdeasPersonality");

// Extract the necessary information
const weddingCardIdeasPersonalityName = weddingCardIdeasPersonalityElement.querySelector(".personality-title").innerText;
const weddingCardIdeasPersonalityDescription = weddingCardIdeasPersonalityElement.querySelector(".personality-description").innerText;
const weddingCardIdeasPersonalityPrompt = weddingCardIdeasPersonalityElement.querySelector(".personality-prompt").innerText;
const weddingCardIdeasPersonalityImageURL = ""; // Extract image URL if it's set in the HTML

// Create a JavaScript object representing the Wedding Card Ideas personality
const weddingCardIdeasPersonality = {
    name: weddingCardIdeasPersonalityName,
    description: weddingCardIdeasPersonalityDescription,
    prompt: weddingCardIdeasPersonalityPrompt,
    image: weddingCardIdeasPersonalityImageURL // Set this to the actual image URL if it's available in the HTML
};

// Call the insertPersonality function with the new Wedding Card Ideas personality object
insertPersonality(weddingCardIdeasPersonality);

// Get the Essay with Bulleted Summary personality HTML element
const essayWithBulletedSummaryPersonalityElement = document.getElementById("essayWithBulletedSummaryPersonality");

// Extract the necessary information
const essayWithBulletedSummaryPersonalityName = essayWithBulletedSummaryPersonalityElement.querySelector(".personality-title").innerText;
const essayWithBulletedSummaryPersonalityDescription = essayWithBulletedSummaryPersonalityElement.querySelector(".personality-description").innerText;
const essayWithBulletedSummaryPersonalityPrompt = essayWithBulletedSummaryPersonalityElement.querySelector(".personality-prompt").innerText;
const essayWithBulletedSummaryPersonalityImageURL = ""; // Extract image URL if it's set in the HTML

// Create a JavaScript object representing the Essay with Bulleted Summary personality
const essayWithBulletedSummaryPersonality = {
    name: essayWithBulletedSummaryPersonalityName,
    description: essayWithBulletedSummaryPersonalityDescription,
    prompt: essayWithBulletedSummaryPersonalityPrompt,
    image: essayWithBulletedSummaryPersonalityImageURL // Set this to the actual image URL if it's available in the HTML
};

// Call the insertPersonality function with the new Essay with Bulleted Summary personality object
insertPersonality(essayWithBulletedSummaryPersonality);

// Get the Resume Updater personality HTML element
const resumeUpdaterPersonalityElement = document.getElementById("resumeUpdaterPersonality");

// Extract the necessary information
const resumeUpdaterPersonalityName = resumeUpdaterPersonalityElement.querySelector(".personality-title").innerText;
const resumeUpdaterPersonalityDescription = resumeUpdaterPersonalityElement.querySelector(".personality-description").innerText;
const resumeUpdaterPersonalityPrompt = resumeUpdaterPersonalityElement.querySelector(".personality-prompt").innerText;
const resumeUpdaterPersonalityImageURL = ""; // Extract image URL if it's set in the HTML

// Create a JavaScript object representing the Resume Updater personality
const resumeUpdaterPersonality = {
    name: resumeUpdaterPersonalityName,
    description: resumeUpdaterPersonalityDescription,
    prompt: resumeUpdaterPersonalityPrompt,
    image: resumeUpdaterPersonalityImageURL // Set this to the actual image URL if it's available in the HTML
};

// Call the insertPersonality function with the new Resume Updater personality object
insertPersonality(resumeUpdaterPersonality);

// Get the Related Key Phrases Generator personality HTML element
const relatedKeyPhrasesGeneratorPersonalityElement = document.getElementById("relatedKeyPhrasesGeneratorPersonality");

// Extract the necessary information
const relatedKeyPhrasesGeneratorPersonalityName = relatedKeyPhrasesGeneratorPersonalityElement.querySelector(".personality-title").innerText;
const relatedKeyPhrasesGeneratorPersonalityDescription = relatedKeyPhrasesGeneratorPersonalityElement.querySelector(".personality-description").innerText;
const relatedKeyPhrasesGeneratorPersonalityPrompt = relatedKeyPhrasesGeneratorPersonalityElement.querySelector(".personality-prompt").innerText;
const relatedKeyPhrasesGeneratorPersonalityImageURL = ""; // Extract image URL if it's set in the HTML

// Create a JavaScript object representing the Related Key Phrases Generator personality
const relatedKeyPhrasesGeneratorPersonality = {
    name: relatedKeyPhrasesGeneratorPersonalityName,
    description: relatedKeyPhrasesGeneratorPersonalityDescription,
    prompt: relatedKeyPhrasesGeneratorPersonalityPrompt,
    image: relatedKeyPhrasesGeneratorPersonalityImageURL // Set this to the actual image URL if it's available in the HTML
};

// Call the insertPersonality function with the new Related Key Phrases Generator personality object
insertPersonality(relatedKeyPhrasesGeneratorPersonality);

// Get the Keyphrase Generator from Meta Description personality HTML element
const keyphraseGeneratorFromMetaDescriptionPersonalityElement = document.getElementById("keyphraseGeneratorFromMetaDescriptionPersonality");

// Extract the necessary information
const keyphraseGeneratorFromMetaDescriptionPersonalityName = keyphraseGeneratorFromMetaDescriptionPersonalityElement.querySelector(".personality-title").innerText;
const keyphraseGeneratorFromMetaDescriptionPersonalityDescription = keyphraseGeneratorFromMetaDescriptionPersonalityElement.querySelector(".personality-description").innerText;
const keyphraseGeneratorFromMetaDescriptionPersonalityPrompt = keyphraseGeneratorFromMetaDescriptionPersonalityElement.querySelector(".personality-prompt").innerText;
const keyphraseGeneratorFromMetaDescriptionPersonalityImageURL = ""; // Extract image URL if it's set in the HTML

// Create a JavaScript object representing the Keyphrase Generator from Meta Description personality
const keyphraseGeneratorFromMetaDescriptionPersonality = {
    name: keyphraseGeneratorFromMetaDescriptionPersonalityName,
    description: keyphraseGeneratorFromMetaDescriptionPersonalityDescription,
    prompt: keyphraseGeneratorFromMetaDescriptionPersonalityPrompt,
    image: keyphraseGeneratorFromMetaDescriptionPersonalityImageURL // Set this to the actual image URL if it's available in the HTML
};

// Call the insertPersonality function with the new Keyphrase Generator from Meta Description personality object
insertPersonality(keyphraseGeneratorFromMetaDescriptionPersonality);

// Get the Sympathy Email Generator personality HTML element
const sympathyEmailGeneratorPersonalityElement = document.getElementById("sympathyEmailGeneratorPersonality");

// Extract the necessary information
const sympathyEmailGeneratorPersonalityName = sympathyEmailGeneratorPersonalityElement.querySelector(".personality-title").innerText;
const sympathyEmailGeneratorPersonalityDescription = sympathyEmailGeneratorPersonalityElement.querySelector(".personality-description").innerText;
const sympathyEmailGeneratorPersonalityPrompt = sympathyEmailGeneratorPersonalityElement.querySelector(".personality-prompt").innerText;
const sympathyEmailGeneratorPersonalityImageURL = ""; // Extract image URL if it's set in the HTML

// Create a JavaScript object representing the Sympathy Email Generator personality
const sympathyEmailGeneratorPersonality = {
    name: sympathyEmailGeneratorPersonalityName,
    description: sympathyEmailGeneratorPersonalityDescription,
    prompt: sympathyEmailGeneratorPersonalityPrompt,
    image: sympathyEmailGeneratorPersonalityImageURL // Set this to the actual image URL if it's available in the HTML
};

// Call the insertPersonality function with the new Sympathy Email Generator personality object
insertPersonality(sympathyEmailGeneratorPersonality);

// Get the Baby Shower Card Writer personality HTML element
const babyShowerCardWriterPersonalityElement = document.getElementById("babyShowerCardWriterPersonality");

// Extract the necessary information
const babyShowerCardWriterPersonalityName = babyShowerCardWriterPersonalityElement.querySelector(".personality-title").innerText;
const babyShowerCardWriterPersonalityDescription = babyShowerCardWriterPersonalityElement.querySelector(".personality-description").innerText;
const babyShowerCardWriterPersonalityPrompt = babyShowerCardWriterPersonalityElement.querySelector(".personality-prompt").innerText;
const babyShowerCardWriterPersonalityImageURL = ""; // Extract image URL if it's set in the HTML

// Create a JavaScript object representing the Baby Shower Card Writer personality
const babyShowerCardWriterPersonality = {
    name: babyShowerCardWriterPersonalityName,
    description: babyShowerCardWriterPersonalityDescription,
    prompt: babyShowerCardWriterPersonalityPrompt,
    image: babyShowerCardWriterPersonalityImageURL // Set this to the actual image URL if it's available in the HTML
};

// Call the insertPersonality function with the new Baby Shower Card Writer personality object
insertPersonality(babyShowerCardWriterPersonality);

// Get the New Year's Card Creator personality HTML element
const newYearsCardCreatorPersonalityElement = document.getElementById("newYearsCardCreatorPersonality");

// Extract the necessary information
const newYearsCardCreatorPersonalityName = newYearsCardCreatorPersonalityElement.querySelector(".personality-title").innerText;
const newYearsCardCreatorPersonalityDescription = newYearsCardCreatorPersonalityElement.querySelector(".personality-description").innerText;
const newYearsCardCreatorPersonalityPrompt = newYearsCardCreatorPersonalityElement.querySelector(".personality-prompt").innerText;
const newYearsCardCreatorPersonalityImageURL = ""; // Extract image URL if it's set in the HTML

// Create a JavaScript object representing the New Year's Card Creator personality
const newYearsCardCreatorPersonality = {
    name: newYearsCardCreatorPersonalityName,
    description: newYearsCardCreatorPersonalityDescription,
    prompt: newYearsCardCreatorPersonalityPrompt,
    image: newYearsCardCreatorPersonalityImageURL // Set this to the actual image URL if it's available in the HTML
};

// Call the insertPersonality function with the new New Year's Card Creator personality object
insertPersonality(newYearsCardCreatorPersonality);

// Get the Valentine's Day Card Generator personality HTML element
const valentinesDayCardGeneratorPersonalityElement = document.getElementById("valentinesDayCardGeneratorPersonality");

// Extract the necessary information
const valentinesDayCardGeneratorPersonalityName = valentinesDayCardGeneratorPersonalityElement.querySelector(".personality-title").innerText;
const valentinesDayCardGeneratorPersonalityDescription = valentinesDayCardGeneratorPersonalityElement.querySelector(".personality-description").innerText;
const valentinesDayCardGeneratorPersonalityPrompt = valentinesDayCardGeneratorPersonalityElement.querySelector(".personality-prompt").innerText;
const valentinesDayCardGeneratorPersonalityImageURL = ""; // Extract image URL if it's set in the HTML

// Create a JavaScript object representing the Valentine's Day Card Generator personality
const valentinesDayCardGeneratorPersonality = {
    name: valentinesDayCardGeneratorPersonalityName,
    description: valentinesDayCardGeneratorPersonalityDescription,
    prompt: valentinesDayCardGeneratorPersonalityPrompt,
    image: valentinesDayCardGeneratorPersonalityImageURL // Set this to the actual image URL if it's available in the HTML
};

// Call the insertPersonality function with the new Valentine's Day Card Generator personality object
insertPersonality(valentinesDayCardGeneratorPersonality);

// Get the Christmas Card Message Generator personality HTML element
const christmasCardMessageGeneratorPersonalityElement = document.getElementById("christmasCardMessageGeneratorPersonality");

// Extract the necessary information
const christmasCardMessageGeneratorPersonalityName = christmasCardMessageGeneratorPersonalityElement.querySelector(".personality-title").innerText;
const christmasCardMessageGeneratorPersonalityDescription = christmasCardMessageGeneratorPersonalityElement.querySelector(".personality-description").innerText;
const christmasCardMessageGeneratorPersonalityPrompt = christmasCardMessageGeneratorPersonalityElement.querySelector(".personality-prompt").innerText;
const christmasCardMessageGeneratorPersonalityImageURL = ""; // Extract image URL if it's set in the HTML

// Create a JavaScript object representing the Christmas Card Message Generator personality
const christmasCardMessageGeneratorPersonality = {
    name: christmasCardMessageGeneratorPersonalityName,
    description: christmasCardMessageGeneratorPersonalityDescription,
    prompt: christmasCardMessageGeneratorPersonalityPrompt,
    image: christmasCardMessageGeneratorPersonalityImageURL // Set this to the actual image URL if it's available in the HTML
};

// Call the insertPersonality function with the new Christmas Card Message Generator personality object
insertPersonality(christmasCardMessageGeneratorPersonality);

// Get the Product Tag Creator personality HTML element
const productTagCreatorPersonalityElement = document.getElementById("productTagCreatorPersonality");

// Extract the necessary information
const productTagCreatorPersonalityName = productTagCreatorPersonalityElement.querySelector(".personality-title").innerText;
const productTagCreatorPersonalityDescription = productTagCreatorPersonalityElement.querySelector(".personality-description").innerText;
const productTagCreatorPersonalityPrompt = productTagCreatorPersonalityElement.querySelector(".personality-prompt").innerText;
const productTagCreatorPersonalityImageURL = ""; // Extract image URL if it's set in the HTML

// Create a JavaScript object representing the Product Tag Creator personality
const productTagCreatorPersonality = {
    name: productTagCreatorPersonalityName,
    description: productTagCreatorPersonalityDescription,
    prompt: productTagCreatorPersonalityPrompt,
    image: productTagCreatorPersonalityImageURL // Set this to the actual image URL if it's available in the HTML
};

// Call the insertPersonality function with the new Product Tag Creator personality object
insertPersonality(productTagCreatorPersonality);

// Get the Project Manager Updates personality HTML element
const projectManagerUpdatesPersonalityElement = document.getElementById("projectManagerUpdatesPersonality");

// Extract the necessary information
const projectManagerUpdatesPersonalityName = projectManagerUpdatesPersonalityElement.querySelector(".personality-title").innerText;
const projectManagerUpdatesPersonalityDescription = projectManagerUpdatesPersonalityElement.querySelector(".personality-description").innerText;
const projectManagerUpdatesPersonalityPrompt = projectManagerUpdatesPersonalityElement.querySelector(".personality-prompt").innerText;
const projectManagerUpdatesPersonalityImageURL = ""; // Extract image URL if it's set in the HTML

// Create a JavaScript object representing the Project Manager Updates personality
const projectManagerUpdatesPersonality = {
    name: projectManagerUpdatesPersonalityName,
    description: projectManagerUpdatesPersonalityDescription,
    prompt: projectManagerUpdatesPersonalityPrompt,
    image: projectManagerUpdatesPersonalityImageURL // Set this to the actual image URL if it's available in the HTML
};

// Call the insertPersonality function with the new Project Manager Updates personality object
insertPersonality(projectManagerUpdatesPersonality);
