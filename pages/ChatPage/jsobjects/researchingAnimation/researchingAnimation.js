export default {
	index: 0,
	messages: ["researching", "researching.", "researching..", "researching..."],
	isAnimating: false, // Flag to check whether animation is running
	text: "",

	// Start the animation if it's not already running
	startAnimation() {
		if (this.isAnimating) return; // Prevent duplicate executions
		this.isAnimating = true;
		this.index = 0;
		console.log("Start animation...");
		this.animate();

		return true;
	},

	// Animation loop: repeatedly updates the message shown
	async animate() {
		while (this.isAnimating) {
			// Exit the loop immediately if stopAnimation() is called
			if (!this.isAnimating) {
				return true;
			}

			this.text = this.messages[this.index];
			chat.history.push({
				role: 'anim',
				prompt: this.text
			});

			await new Promise(resolve => setTimeout(resolve, 500)); // Wait for 500ms
			this.removeAnimText();

			if (!this.isAnimating) {
				return true;
			}

			// Move to the next message in the sequence
			this.index = (this.index + 1) % this.messages.length;
		}
		return true;
	},

	// Stop the animation and clean up
	async stopAnimation() {
		console.log("Stop animation");
		this.isAnimating = false;
		this.text = "";
		this.removeAnimText();

		return true;
	},

	// Remove the current animation message from chat history
	removeAnimText() {
		const index = chat.history.findIndex(item => item.role === "anim");
		if (index !== -1) {
			chat.history.splice(index, 1); // Remove the first "anim" element
		}
	}
};
