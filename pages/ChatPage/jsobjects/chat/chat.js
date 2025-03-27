export default {
  appname: 'ai-chat',
  history: [],
  openAIapiKey: '',
  firecrawlApiKey: '',
  serpApiKey: '',
  state: 'AI',        // Current state: NORMAL, FEEDBACK, or RESEARCH
  deepResearch: false,    // Whether deep research mode is enabled
  ansLang: 'English',     // Default answer language
  maxSearch: -1,
  breadth: -1,
  depth: -1,
  isDeepResearchValid: false,  // Whether deep research parameters are valid

  // Initialization: Load previous history, set deepResearch toggle, initialize Supabase client
  init() {
    let historyCache = appsmith.store[this.appname];
    if (historyCache !== undefined) {
      this.history = historyCache;
    }
    deepResearchToggle.setValue(false);
    this.deepResearch = false;
  },

  // Main function to handle user input and AI response
  async submit() {
    const input = prompt.text;
    resetWidget('prompt');

    // Save user message to history (role: user)
    this.history.push({
      role: "user",
      prompt: input
    });

    let currentMode = this.state;

    // If deepResearch mode is enabled, switch to the appropriate state
    if (this.deepResearch) {
      if (this.isDeepResearchValid) {
        if (this.state === "AI") {
          this.state = "FEEDBACK";
          currentMode = "FEEDBACK";
        } else if (this.state === "FEEDBACK") {
          this.state = "RESEARCH";
          currentMode = "RESEARCH";
        }
      } else {
        const error = `Deep Research parameters are invalid.
        Max Search: ${MaxSearch.isValid}
        Depth: ${Depth.isValid}
        Breath: ${Breadth.isValid}`;
        showAlert(error, 'warning');
        this.history.pop(); // Remove invalid user input
        return;
      }
    }

    // Call AIChat function (response includes output and id if in RESEARCH mode)
    try {
      const aiResponse = await AIChat.run({
        state: currentMode,
        history: this.history
      });

      // Save assistant response to history
      this.history.push({
        role: currentMode,
        prompt: aiResponse.output
      });

      console.log(currentMode, aiResponse.output);
      await storeValue(this.appname, this.history);

      // In RESEARCH mode, subscribe to real-time updates using aiResponse.id
      if (currentMode === "RESEARCH" && aiResponse.id) {
        const researchRowId = aiResponse.id;

        // Start loading animation
        researchingAnimation.startAnimation(this.history);

        // Set WebSocket connection for real-time updates
        supabaseWs.initWebsocket(researchRowId);

        // Reset state to AI after RESEARCH if deepResearch is on
        if (this.deepResearch && currentMode === "RESEARCH") {
          this.state = "AI";
        }
      }
    } catch (error) {
      throw new Error(error);
    }
  },

  // Called when deep research toggle is changed in the UI
  setDeepResearch(newState) {
    this.deepResearch = newState; // newState is a boolean
    this.setDeepResearchParams();
  },

  // Set and validate parameters for deep research
  setDeepResearchParams() {
    this.isDeepResearchValid = MaxSearch.isValid && Breadth.isValid && Depth.isValid;
    if (this.isDeepResearchValid) {
      this.maxSearch = parseInt(MaxSearch.text);
      this.breadth = parseInt(Breadth.text);
      this.depth = parseInt(Depth.text);
    }
  },

  // Set API keys from the UI input fields
  setAPIKey() {
    this.openAIapiKey = openAIapiKey.text;
    this.firecrawlApiKey = firecrawlApiKey.text;
    this.serpApiKey = serpApiKey.text;
  },

  // Set answer language from UI input field
  setAnsLang() {
    this.ansLang = ansLang.text;
  },

  // Reset chat history and state, but keep API keys
  reset() {
    removeValue(this.appname);
    this.history = [];
    this.state = 'AI';
    resetWidget('prompt');
  }
};