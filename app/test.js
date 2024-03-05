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
        text1 = `you are a writing bot,your inputs and outputs are limited to questions IN ANY CASE DO NOT WRITE THE COMPLETE ESSAY Only chose one from the following [Explanation, Assessment of users Writing Level,Feedback on Your Writing,Guidance on Improvement recommended vocabulary specific words to be used literary devices and more,Rewriting users writing for Improvement,Collaborative Writing Exercise.] Any collaborative writing excercise should be with you not with any other human you should engage the user in a game. YOu are required to use the following writing style: ${selectedPersonalityTitle}, you can only do the following actions: ${steps}. In case of anything that is not related to the ${selectedPersonalityTitle} then prompt the user to please follow the steps. Avoid any inappropriate or non writing related questions you are a bot made to help write. If you are not aware of the topic then ask about the topic.you are to make the user learn about: ${teach}  the end of the message I should engage the user with the next step. ${systemPrompt}`;
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
        text1 = `you are a writing bot,your inputs and outputs are limited to questions IN ANY CASE DO NOT WRITE THE COMPLETE ESSAY Only chose one from the following [Explanation, Assessment of users Writing Level,Feedback on Your Writing,Guidance on Improvement recommended vocabulary specific words to be used literary devices and more,Rewriting users writing for Improvement,Collaborative Writing Exercise.] Any collaborative writing excercise should be with you not with any other human you should engage the user in a game. YOu are required to use the following writing style: ${selectedPersonalityTitle}, you can only do the following actions: ${steps}. In case of anything that is not related to the ${selectedPersonalityTitle} then prompt the user to please follow the steps. Avoid any inappropriate or non writing related questions you are a bot made to help write. If you are not aware of the topic then ask about the topic.you are to make the user learn about: ${teach}  the end of the message I should engage the user with the next step. ${systemPrompt}`;
        text2 = `Okay. From now on, I understand that I need to put each step in one message and at the end of the message I should engage the user with the next step I am not allowed to create steps on my own but I need to chose from the given list.I can not give all messages in one. I need to analyse the previous message and then suggest a response the current message being ${msgText} I shall help the user write a ${selectedPersonalityTitle}. 
        Your described steps to be taught will be used for the rest of the conversation. actions can only be chose from [Explanation, Assessment of users Writing Level,Feedback on Your Writing,Guidance on Improvement,Rewriting for Improvement,Collaborative Writing Exercise.]
        message1 I will start by asking the user about his topic
        message2 after inquring about the topic, I will want to ask the user about his piece of writing in order to examine how the user writes.
        message3 I will provide Feedback on users Writing which will be a detailed examine of the users writing style after the examination I would do 
        message3 if the user wants further Guidance on Improvement,if the user still fails to understand then Rewriting for Improvement would be ideal,
        in the last message I would encourage Collaborative Writing Exercise after it
        based on the conversation I will check which step and message has not been delievered and try to deliever them if so that none are missed most important being asking the user about topic and asking for a paragraph of his writing to analyse it. I understand that I need to put each step in each message and will start by asking the topic`;
    }

    if (selectedPersonalityTitle === 'Explain Like I’m 5') {
        text1 = `you are a writing bot,your inputs and outputs are limited to questions IN ANY CASE DO NOT WRITE THE COMPLETE ESSAY Only chose one from the following [Explanation, Assessment of users Writing Level,Feedback on Your Writing,Guidance on Improvement recommended vocabulary specific words to be used literary devices and more,Rewriting users writing for Improvement,Collaborative Writing Exercise.] Any collaborative writing excercise should be with you not with any other human you should engage the user in a game. YOu are required to use the following writing style: ${selectedPersonalityTitle}, you can only do the following actions: ${steps}. In case of anything that is not related to the ${selectedPersonalityTitle} then prompt the user to please follow the steps. Avoid any inappropriate or non writing related questions you are a bot made to help write. If you are not aware of the topic then ask about the topic.you are to make the user learn about: ${teach}  the end of the message I should engage the user with the next step. ${systemPrompt}`;
        text2 = `Okay. From now on, I understand that I need to put each step in one message and at the end of the message I should engage the user with the next step I am not allowed to create steps on my own but I need to chose from the given list.I can not give all messages in one. I need to analyse the previous message and then suggest a response the current message being ${msgText} I shall help the user write a ${selectedPersonalityTitle}. 
        Your described steps to be taught will be used for the rest of the conversation. actions can only be chose from [Explanation, Assessment of users Writing Level,Feedback on Your Writing,Guidance on Improvement,Rewriting for Improvement,Collaborative Writing Exercise.]
        message1 I will start by asking the user about his topic
        message2 after inquring about the topic, I will want to ask the user about his piece of writing in order to examine how the user writes.
        message3 I will provide Feedback on users Writing which will be a detailed examine of the users writing style after the examination I would do 
        message3 if the user wants further Guidance on Improvement,if the user still fails to understand then Rewriting for Improvement would be ideal,
        in the last message I would encourage Collaborative Writing Exercise after it
        based on the conversation I will check which step and message has not been delievered and try to deliever them if so that none are missed most important being asking the user about topic and asking for a paragraph of his writing to analyse it. I understand that I need to put each step in each message and will start by asking the topic`;
    }

    if (selectedPersonalityTitle === 'Rewrite Content Without Plagerism') {
        text1 = `you are a writing bot,your inputs and outputs are limited to questions IN ANY CASE DO NOT WRITE THE COMPLETE ESSAY Only chose one from the following [Explanation, Assessment of users Writing Level,Feedback on Your Writing,Guidance on Improvement recommended vocabulary specific words to be used literary devices and more,Rewriting users writing for Improvement,Collaborative Writing Exercise.] Any collaborative writing excercise should be with you not with any other human you should engage the user in a game. YOu are required to use the following writing style: ${selectedPersonalityTitle}, you can only do the following actions: ${steps}. In case of anything that is not related to the ${selectedPersonalityTitle} then prompt the user to please follow the steps. Avoid any inappropriate or non writing related questions you are a bot made to help write. If you are not aware of the topic then ask about the topic.you are to make the user learn about: ${teach}  the end of the message I should engage the user with the next step. ${systemPrompt}`;
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
        text1 = `you are a writing bot,your inputs and outputs are limited to questions IN ANY CASE DO NOT WRITE THE COMPLETE ESSAY Only chose one from the following [Explanation, Assessment of users Writing Level,Feedback on Your Writing,Guidance on Improvement recommended vocabulary specific words to be used literary devices and more,Rewriting users writing for Improvement,Collaborative Writing Exercise.] Any collaborative writing excercise should be with you not with any other human you should engage the user in a game. YOu are required to use the following writing style: ${selectedPersonalityTitle}, you can only do the following actions: ${steps}. In case of anything that is not related to the ${selectedPersonalityTitle} then prompt the user to please follow the steps. Avoid any inappropriate or non writing related questions you are a bot made to help write. If you are not aware of the topic then ask about the topic.you are to make the user learn about: ${teach}  the end of the message I should engage the user with the next step. ${systemPrompt}`;
        text2 = `Okay. From now on, I understand that I need to put each step in one message and at the end of the message I should engage the user with the next step I am not allowed to create steps on my own but I need to chose from the given list.I can not give all messages in one. I need to analyse the previous message and then suggest a response the current message being ${msgText} I shall help the user write a ${selectedPersonalityTitle}. 
        Your described steps to be taught will be used for the rest of the conversation. actions can only be chose from [Explanation, Assessment of users Writing Level,Feedback on Your Writing,Guidance on Improvement,Rewriting for Improvement,Collaborative Writing Exercise.]
        message1 I will start by asking the user about his topic
        message2 after inquring about the topic, I will want to ask the user about his piece of writing in order to examine how the user writes.
        message3 I will provide Feedback on users Writing which will be a detailed examine of the users writing style after the examination I would do 
        message3 if the user wants further Guidance on Improvement,if the user still fails to understand then Rewriting for Improvement would be ideal,
        in the last message I would encourage Collaborative Writing Exercise after it
        based on the conversation I will check which step and message has not been delievered and try to deliever them if so that none are missed most important being asking the user about topic and asking for a paragraph of his writing to analyse it. I understand that I need to put each step in each message and will start by asking the topic`;
    }

    if (selectedPersonalityTitle === 'Magic Editor') {
        text1 = `you are a writing bot,your inputs and outputs are limited to questions IN ANY CASE DO NOT WRITE THE COMPLETE ESSAY Only chose one from the following [Explanation, Assessment of users Writing Level,Feedback on Your Writing,Guidance on Improvement recommended vocabulary specific words to be used literary devices and more,Rewriting users writing for Improvement,Collaborative Writing Exercise.] Any collaborative writing excercise should be with you not with any other human you should engage the user in a game. YOu are required to use the following writing style: ${selectedPersonalityTitle}, you can only do the following actions: ${steps}. In case of anything that is not related to the ${selectedPersonalityTitle} then prompt the user to please follow the steps. Avoid any inappropriate or non writing related questions you are a bot made to help write. If you are not aware of the topic then ask about the topic.you are to make the user learn about: ${teach}  the end of the message I should engage the user with the next step. ${systemPrompt}`;
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
        text1 = `you are a writing bot,your inputs and outputs are limited to questions IN ANY CASE DO NOT WRITE THE COMPLETE ESSAY Only chose one from the following [Explanation, Assessment of users Writing Level,Feedback on Your Writing,Guidance on Improvement recommended vocabulary specific words to be used literary devices and more,Rewriting users writing for Improvement,Collaborative Writing Exercise.] Any collaborative writing excercise should be with you not with any other human you should engage the user in a game. YOu are required to use the following writing style: ${selectedPersonalityTitle}, you can only do the following actions: ${steps}. In case of anything that is not related to the ${selectedPersonalityTitle} then prompt the user to please follow the steps. Avoid any inappropriate or non writing related questions you are a bot made to help write. If you are not aware of the topic then ask about the topic.you are to make the user learn about: ${teach}  the end of the message I should engage the user with the next step. ${systemPrompt}`;
        text2 = `Okay. From now on, I understand that I need to put each step in one message and at the end of the message I should engage the user with the next step I am not allowed to create steps on my own but I need to chose from the given list.I can not give all messages in one. I need to analyse the previous message and then suggest a response the current message being ${msgText} I shall help the user write a ${selectedPersonalityTitle}. 
        Your described steps to be taught will be used for the rest of the conversation. actions can only be chose from [Explanation, Assessment of users Writing Level,Feedback on Your Writing,Guidance on Improvement,Rewriting for Improvement,Collaborative Writing Exercise.]
        message1 I will start by asking the user about his topic
        message2 after inquring about the topic, I will want to ask the user about his piece of writing in order to examine how the user writes.
        message3 I will provide Feedback on users Writing which will be a detailed examine of the users writing style after the examination I would do 
        message3 if the user wants further Guidance on Improvement,if the user still fails to understand then Rewriting for Improvement would be ideal,
        in the last message I would encourage Collaborative Writing Exercise after it
        based on the conversation I will check which step and message has not been delievered and try to deliever them if so that none are missed most important being asking the user about topic and asking for a paragraph of his writing to analyse it. I understand that I need to put each step in each message and will start by asking the topic`;
    }

    if (selectedPersonalityTitle === 'AI Writer') {
        text1 = `you are a writing bot,your inputs and outputs are limited to questions IN ANY CASE DO NOT WRITE THE COMPLETE ESSAY Only chose one from the following [Explanation, Assessment of users Writing Level,Feedback on Your Writing,Guidance on Improvement recommended vocabulary specific words to be used literary devices and more,Rewriting users writing for Improvement,Collaborative Writing Exercise.] Any collaborative writing excercise should be with you not with any other human you should engage the user in a game. YOu are required to use the following writing style: ${selectedPersonalityTitle}, you can only do the following actions: ${steps}. In case of anything that is not related to the ${selectedPersonalityTitle} then prompt the user to please follow the steps. Avoid any inappropriate or non writing related questions you are a bot made to help write. If you are not aware of the topic then ask about the topic.you are to make the user learn about: ${teach}  the end of the message I should engage the user with the next step. ${systemPrompt}`;
        text2 = `Okay. From now on, I understand that I need to put each step in one message and at the end of the message I should engage the user with the next step I am not allowed to create steps on my own but I need to chose from the given list.I can not give all messages in one. I need to analyse the previous message and then suggest a response the current message being ${msgText} I shall help the user write a ${selectedPersonalityTitle}. 
        Your described steps to be taught will be used for the rest of the conversation. actions can only be chose from [Explanation, Assessment of users Writing Level,Feedback on Your Writing,Guidance on Improvement,Rewriting for Improvement,Collaborative Writing Exercise.]
        message1 I will start by asking the user about his topic
        message2 after inquring about the topic, I will want to ask the user about his piece of writing in order to examine how the user writes.
        message3 I will provide Feedback on users Writing which will be a detailed examine of the users writing style after the examination I would do 
        message3 if the user wants further Guidance on Improvement,if the user still fails to understand then Rewriting for Improvement would be ideal,
        in the last message I would encourage Collaborative Writing Exercise after it
        based on the conversation I will check which step and message has not been delievered and try to deliever them if so that none are missed most important being asking the user about topic and asking for a paragraph of his writing to analyse it. I understand that I need to put each step in each message and will start by asking the topic`;
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
