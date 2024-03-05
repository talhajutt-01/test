// Function to toggle the visibility of the chat widget container
document.getElementById("chatWidgetButton").addEventListener("click", function() {
  var chatWidgetContainer = document.getElementById("chatWidgetContainer");
  if (chatWidgetContainer.style.display === "none") {
      chatWidgetContainer.style.display = "block";
  } else {
      chatWidgetContainer.style.display = "none";
  }
});
