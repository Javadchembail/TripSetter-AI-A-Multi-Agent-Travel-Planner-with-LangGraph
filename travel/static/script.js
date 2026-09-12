/* ============================================================
   TripSetter AI
   Frontend Logic
   ============================================================ */


/* ============================================================
   GLOBAL STATE
   ============================================================ */

let currentThreadId =
    localStorage.getItem("travel_thread_id") || null;

let latestAnswerMarkdown = "";

let originalTravelRequest =
    localStorage.getItem("travel_request") || "";

let progressTimer = null;

let progressValue = 0;



/* ============================================================
   DOM ELEMENTS
   ============================================================ */

const userInput =
    document.getElementById("userInput");

const characterCount =
    document.getElementById("characterCount");

const generateBtn =
    document.getElementById("generateBtn");

const generateText =
    document.getElementById("generateText");

const generateIcon =
    document.getElementById("generateIcon");

const generateLoader =
    document.getElementById("generateLoader");

const progressSection =
    document.getElementById("progressSection");

const progressBar =
    document.getElementById("progressBar");

const progressPercentage =
    document.getElementById("progressPercentage");

const progressMessage =
    document.getElementById("progressMessage");

const resultSection =
    document.getElementById("resultSection");

const resultBox =
    document.getElementById("resultBox");

const threadInfo =
    document.getElementById("threadInfo");



/* ============================================================
   CHARACTER COUNTER
   ============================================================ */

if (userInput) {

    userInput.addEventListener("input", () => {

        const length =
            userInput.value.length;

        characterCount.textContent =
            `${length} / 2000`;

    });

}



/* ============================================================
   CTRL + ENTER
   ============================================================ */

if (userInput) {

    userInput.addEventListener("keydown", (event) => {

        if (
            event.ctrlKey &&
            event.key === "Enter"
        ) {

            event.preventDefault();

            sendMessage();

        }

    });

}



/* ============================================================
   USE DESTINATION SUGGESTION
   ============================================================ */

function useSuggestion(text) {

    userInput.value = text;

    characterCount.textContent =
        `${text.length} / 2000`;

    userInput.focus();

    userInput.style.height = "auto";

    userInput.style.height =
        `${Math.min(userInput.scrollHeight, 260)}px`;

}



/* ============================================================
   TOGGLE PREFERENCE
   ============================================================ */

function togglePreference(button) {

    button.classList.toggle("active");

}



/* ============================================================
   GET SELECTED PREFERENCES
   ============================================================ */

function getSelectedPreferences() {

    const buttons =
        document.querySelectorAll(
            ".preference-chip.active"
        );

    return Array.from(buttons)
        .map(button =>
            button.dataset.value
        );

}



/* ============================================================
   SEND MAIN REQUEST
   ============================================================ */

async function sendMessage() {

    const message =
        userInput.value.trim();


    if (!message) {

        showToast(
            "Please describe your trip first.",
            "warning"
        );

        userInput.focus();

        return;

    }


    const preferences =
        getSelectedPreferences();


    let finalMessage =
        message;


    if (preferences.length > 0) {

        finalMessage +=
            `\n\nTravel preferences: ${preferences.join(", ")}.`;

    }


    originalTravelRequest =
        message;

    localStorage.setItem(
        "travel_request",
        originalTravelRequest
    );


    setLoading(true);

    showProgress();

    hideResults();


    try {

        const response =
            await fetch(
                "/api/travel",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        message:
                            finalMessage,

                        thread_id:
                            currentThreadId

                    })

                }
            );


        if (!response.ok) {

            throw new Error(
                `Server error: ${response.status}`
            );

        }


        const data =
            await response.json();


        if (
            data.thread_id
        ) {

            currentThreadId =
                data.thread_id;

            localStorage.setItem(
                "travel_thread_id",
                currentThreadId
            );

        }


        if (
            data.success === false
        ) {

            throw new Error(
                data.error ||
                data.message ||
                "Travel planning failed."
            );

        }


        const answer =
            data.answer ||
            data.response ||
            data.message ||
            "No travel plan was returned.";


        latestAnswerMarkdown =
            answer;


        finishProgress();


        setTimeout(() => {

            renderResult(
                answer,
                data
            );

            setLoading(false);

        }, 500);


    } catch (error) {

        console.error(
            "TripSetter error:",
            error
        );


        stopProgress();

        setLoading(false);


        showError(
            error.message
        );

    }

}



/* ============================================================
   ALTERNATIVE REQUEST
   ============================================================ */

async function requestAlternative(type) {

    if (!originalTravelRequest) {

        showToast(
            "Please generate a trip first.",
            "warning"
        );

        return;

    }


    const prompts = {

        flights: `
Find alternative flight options for my current trip.

Keep the same:
- origin
- destination
- dates
- number of travelers
- trip duration
- general budget

Show different airlines, timings, routes or connections where appropriate.

Compare the alternatives and explain which one is best.

Do not invent real-time prices or availability.
If live data is unavailable, clearly label prices as estimates.
`,

        hotels: `
Find alternative hotel options for my current trip.

Keep the same:
- destination
- travel dates
- number of travelers
- general budget

Give several alternatives with different locations,
ratings, facilities and value.

Explain the advantages and disadvantages of each.

Do not invent real-time availability.
Use estimated pricing when live pricing is unavailable.
`,

        cheaper: `
Optimize my current travel plan to make it cheaper.

Keep my important requirements wherever possible.

Look for ways to reduce:
- flight cost
- hotel cost
- transportation cost
- activity cost
- food cost

Explain exactly what you changed and how it affects the experience.

Do not invent live prices.
Clearly distinguish estimates from confirmed information.
`,

        better: `
Improve my current travel plan.

Find better quality:
- flights
- hotels
- activities
- restaurants
- experiences
- routes

Prioritize convenience, quality and memorable experiences.

Explain why the new options are better.

Do not invent real-time availability or prices.
`,

        itinerary: `
Create a completely different itinerary for my current trip.

Keep the same:
- destination
- travel dates
- travelers
- major requirements

But change the route, schedule and activities.

Give me a fresh alternative itinerary with a different experience.
`

    };


    const prompt =
        prompts[type];


    if (!prompt) {

        showToast(
            "Unknown option.",
            "warning"
        );

        return;

    }


    setLoading(true);

    showProgress();

    try {

        const response =
            await fetch(
                "/api/travel",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        message:
                            `${originalTravelRequest}\n\n${prompt}`,

                        thread_id:
                            currentThreadId

                    })

                }
            );


        if (!response.ok) {

            throw new Error(
                `Server error: ${response.status}`
            );

        }


        const data =
            await response.json();


        if (data.thread_id) {

            currentThreadId =
                data.thread_id;

            localStorage.setItem(
                "travel_thread_id",
                currentThreadId
            );

        }


        if (
            data.success === false
        ) {

            throw new Error(
                data.error ||
                "Alternative request failed."
            );

        }


        const answer =
            data.answer ||
            data.response ||
            data.message ||
            "No alternative was returned.";


        latestAnswerMarkdown =
            answer;


        finishProgress();


        setTimeout(() => {

            renderResult(
                answer,
                data
            );

            setLoading(false);

            switchToOverview();

            showToast(
                "New travel option generated.",
                "success"
            );

        }, 500);


    } catch (error) {

        console.error(error);

        stopProgress();

        setLoading(false);

        showError(
            error.message
        );

    }

}



/* ============================================================
   RENDER RESULT
   ============================================================ */

function renderResult(answer, data = {}) {

    resultSection.classList.remove(
        "hidden"
    );


    if (window.marked) {

        resultBox.innerHTML =
            marked.parse(answer);

    } else {

        resultBox.textContent =
            answer;

    }


    if (currentThreadId) {

        threadInfo.textContent =
            `AI-generated plan • Thread ${currentThreadId}`;

    } else {

        threadInfo.textContent =
            "AI-generated travel plan";

    }


    window.scrollTo({

        top:
            resultSection.offsetTop - 80,

        behavior:
            "smooth"

    });

}



/* ============================================================
   TAB SWITCHING
   ============================================================ */

function switchTab(button, tabName) {

    document
        .querySelectorAll(".result-tab")
        .forEach(tab => {

            tab.classList.remove(
                "active"
            );

        });


    button.classList.add(
        "active"
    );


    document
        .querySelectorAll(".tab-panel")
        .forEach(panel => {

            panel.classList.remove(
                "active"
            );

        });


    const target =
        document.getElementById(
            tabName
        );


    if (target) {

        target.classList.add(
            "active"
        );

    }

}



function switchToOverview() {

    const overviewButton =
        document.querySelector(
            '.result-tab[onclick*="overview"]'
        );


    if (overviewButton) {

        switchTab(
            overviewButton,
            "overview"
        );

    }

}



/* ============================================================
   LOADING STATE
   ============================================================ */

function setLoading(loading) {

    if (!generateBtn) {
        return;
    }


    generateBtn.disabled =
        loading;


    if (loading) {

        generateText.textContent =
            "Planning your trip...";

        generateIcon.classList.add(
            "hidden"
        );

        generateLoader.classList.remove(
            "hidden"
        );

    } else {

        generateText.textContent =
            "Generate My Trip";

        generateIcon.classList.remove(
            "hidden"
        );

        generateLoader.classList.add(
            "hidden"
        );

    }

}



/* ============================================================
   PROGRESS ANIMATION
   ============================================================ */

function showProgress() {

    progressSection.classList.remove(
        "hidden"
    );


    progressValue = 8;

    updateProgress();


    clearInterval(
        progressTimer
    );


    progressTimer =
        setInterval(() => {

            if (
                progressValue < 88
            ) {

                progressValue +=
                    Math.random() * 7;

                progressValue =
                    Math.min(
                        progressValue,
                        88
                    );

                updateProgress();

            }

        }, 900);

}



function updateProgress() {

    const rounded =
        Math.round(
            progressValue
        );


    progressBar.style.width =
        `${rounded}%`;


    progressPercentage.textContent =
        rounded;


    updateAgentStep(
        rounded
    );

}



function updateAgentStep(value) {

    const messages = [

        [
            0,
            "Understanding your travel requirements..."
        ],

        [
            20,
            "Searching for suitable flight options..."
        ],

        [
            42,
            "Finding hotels and accommodation..."
        ],

        [
            64,
            "Building your day-by-day itinerary..."
        ],

        [
            80,
            "Optimizing the plan and estimated budget..."
        ]

    ];


    let message =
        messages[0][1];


    for (
        let i = 0;
        i < messages.length;
        i++
    ) {

        if (
            value >= messages[i][0]
        ) {

            message =
                messages[i][1];

        }

    }


    progressMessage.textContent =
        message;


    const steps =
        document.querySelectorAll(
            ".agent-step"
        );


    steps.forEach(
        (step, index) => {

            step.classList.remove(
                "active",
                "completed"
            );


            const thresholds =
                [
                    0,
                    20,
                    42,
                    64,
                    80
                ];


            if (
                value >=
                thresholds[index] + 18
            ) {

                step.classList.add(
                    "completed"
                );

            } else if (
                value >=
                thresholds[index]
            ) {

                step.classList.add(
                    "active"
                );

            }

        }
    );

}



function finishProgress() {

    clearInterval(
        progressTimer
    );


    progressValue =
        100;


    progressBar.style.width =
        "100%";


    progressPercentage.textContent =
        "100";


    progressMessage.textContent =
        "Your personalized travel plan is ready!";


    document
        .querySelectorAll(".agent-step")
        .forEach(step => {

            step.classList.remove(
                "active"
            );

            step.classList.add(
                "completed"
            );

        });

}



function stopProgress() {

    clearInterval(
        progressTimer
    );

    progressTimer =
        null;

    progressSection.classList.add(
        "hidden"
    );

}



/* ============================================================
   HIDE RESULTS
   ============================================================ */

function hideResults() {

    resultSection.classList.add(
        "hidden"
    );

}



/* ============================================================
   COPY RESULT
   ============================================================ */

async function copyResult() {

    if (!latestAnswerMarkdown) {

        showToast(
            "There is no result to copy.",
            "warning"
        );

        return;

    }


    try {

        await navigator.clipboard.writeText(
            latestAnswerMarkdown
        );


        showToast(
            "Trip plan copied!",
            "success"
        );

    } catch (error) {

        console.error(error);

        showToast(
            "Could not copy the result.",
            "error"
        );

    }

}



/* ============================================================
   DOWNLOAD PDF
   ============================================================ */

function downloadPDF() {

    const element =
        document.getElementById(
            "pdfContent"
        );


    if (!element) {

        showToast(
            "Nothing to download.",
            "warning"
        );

        return;

    }


    const options = {

        margin:
            0.5,

        filename:
            "TripSetter-Travel-Plan.pdf",

        image: {

            type:
                "jpeg",

            quality:
                0.95

        },

        html2canvas: {

            scale:
                2,

            useCORS:
                true

        },

        jsPDF: {

            unit:
                "in",

            format:
                "a4",

            orientation:
                "portrait"

        }

    };


    showToast(
        "Preparing your PDF...",
        "success"
    );


    html2pdf()
        .set(options)
        .from(element)
        .save();

}



/* ============================================================
   ERROR DISPLAY
   ============================================================ */

function showError(message) {

    resultSection.classList.remove(
        "hidden"
    );


    resultBox.innerHTML = `

        <div class="error-box">

            <div class="error-icon">
                ⚠️
            </div>

            <div>

                <h3>
                    Something went wrong
                </h3>

                <p>
                    ${escapeHtml(message)}
                </p>

                <p class="error-help">
                    Please check that the backend is running
                    and try again.
                </p>

            </div>

        </div>

    `;


    threadInfo.textContent =
        "Request failed";


    window.scrollTo({

        top:
            resultSection.offsetTop - 80,

        behavior:
            "smooth"

    });

}



/* ============================================================
   ESCAPE HTML
   ============================================================ */

function escapeHtml(value) {

    return String(value)
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}



/* ============================================================
   TOAST
   ============================================================ */

function showToast(
    message,
    type = "success"
) {

    const toast =
        document.getElementById(
            "toast"
        );

    const toastMessage =
        document.getElementById(
            "toastMessage"
        );

    const toastIcon =
        document.getElementById(
            "toastIcon"
        );


    toast.className =
        "toast";


    if (type === "error") {

        toast.classList.add(
            "toast-error"
        );

        toastIcon.textContent =
            "✕";

    } else if (
        type === "warning"
    ) {

        toast.classList.add(
            "toast-warning"
        );

        toastIcon.textContent =
            "⚠";

    } else {

        toast.classList.add(
            "toast-success"
        );

        toastIcon.textContent =
            "✓";

    }


    toastMessage.textContent =
        message;


    toast.classList.add(
        "show"
    );


    setTimeout(() => {

        toast.classList.remove(
            "show"
        );

    }, 3000);

}



/* ============================================================
   INITIALIZATION
   ============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        if (
            originalTravelRequest &&
            userInput
        ) {

            // Don't automatically populate the
            // input on page load. The value is only
            // retained internally for alternatives.

        }

    }
);