export default {
  // WebSocket object
  socket: undefined,
  // Flag indicating whether the socket was closed intentionally
  manuallyClosed: false,
  // The row ID being tracked
  rowId: '',
  // Polling interval (30 seconds)
  pollInterval: 30000,
  // setInterval ID for polling
  pollingTimer: null,
  // Supabase client for polling
  supabaseClient: undefined,

  /**
   * 1) Initialize WebSocket connection
   */
  initWebsocket(rowId) {
    this.rowId = rowId;
    this.manuallyClosed = false;

    // Build the Supabase Realtime WebSocket URL
    const parsedUrl = new URL(db.supabaseUrl);
    const url = parsedUrl.hostname + parsedUrl.pathname;
    const WS_ENDPOINT = `wss://${url}/realtime/v1/websocket?apikey=${db.supabaseKey}&vsn=1.0.0`;

    this.socket = new WebSocket(WS_ENDPOINT);
    this.socket.onopen = this.socketOnOpen.bind(this);
    this.socket.onmessage = this.socketOnMessage.bind(this);
    this.socket.onclose = this.socketOnClose.bind(this);
  },

  /**
   * 2) WebSocket onOpen handler
   */
  socketOnOpen() {
    console.log("WebSocket connection opened");

    // Subscribe to the 'deepResearch' table
    this.socket.send(JSON.stringify({
      topic: 'realtime:public:deepResearch',
      event: 'phx_join',
      payload: { apikey: db.supabaseKey },
      ref: '1'
    }));
  },

  /**
   * 3) WebSocket onMessage handler
   */
  socketOnMessage(event) {
    try {
      const response = JSON.parse(event.data);
      console.log("WebSocket message received:", response);

      // Handle UPDATE events from Supabase Realtime
      if (response.payload?.type === 'UPDATE') {
        const eventId = response.payload.record.id;
        if (eventId === this.rowId) {
          // Process the updated record
          this.handleRecordUpdate(response.payload.record.report);

          // Intentionally close the socket
          this.manuallyClosed = true;
          this.socket.close();
        }
      }
    } catch (err) {
      console.error("Error parsing WebSocket message:", err);
    }
  },

  /**
   * 4) WebSocket onClose handler
   */
  socketOnClose(evt) {
    console.log("WebSocket onClose - code:", evt.code, "reason:", evt.reason);

    // If the socket wasn't closed intentionally, switch to polling
    if (!this.manuallyClosed) {
      console.warn("Socket closed unexpectedly. Switching to 30s polling...");
      this.startPolling();
    } else {
      console.log("Socket closed intentionally.");
    }
  },

  /**
   * 5) Start polling every 30 seconds
   */
  startPolling() {
    this.stopPolling();

    // Create a Supabase client only when needed
    if (!this.supabaseClient) {
      this.supabaseClient = supabase.createClient(db.supabaseUrl, db.supabaseKey);
    }

    this.pollingTimer = setInterval(() => {
      this.fetchRecordAndCheck();
    }, this.pollInterval);
  },

  /**
   * 6) Stop polling
   */
  stopPolling() {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }

    // Remove the Supabase client after polling ends
    if (this.supabaseClient) {
      this.supabaseClient = undefined;
    }
  },

  /**
   * 7) Fetch a record from Supabase and check for updates
   */
  async fetchRecordAndCheck() {
    if (!this.supabaseClient) return;

    try {
      const { data, error } = await this.supabaseClient
        .from('deepResearch')
        .select('id, report')
        .eq('id', this.rowId)
        .single();

      if (error) {
        console.error("Supabase fetch error:", error);
        return;
      }

      // If the 'report' field is present, it indicates an update
      if (data && data.report) {
        console.log("Polling found updated record. Stopping polling.");
        this.stopPolling();
        this.handleRecordUpdate(data.report);
      }
    } catch (err) {
      console.error("Error in fetchRecordAndCheck:", err);
    }
  },

  /**
   * 8) Common method to handle record updates
   */
  handleRecordUpdate(reportData) {
    // Example logic: stop animation, update chat history
    researchingAnimation.stopAnimation();
    chat.history.push({
      role: 'RESEARCH',
      prompt: reportData
    });
  }
};
