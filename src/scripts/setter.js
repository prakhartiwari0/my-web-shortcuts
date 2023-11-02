
import './styles/mws.css'

import { finder } from '@medv/finder'

import { toJSON } from '../modules/domJsonConverter.js'

import {
    addClass, rmClass, getElemAt, setTextContent, setInnerHTML, getAttr, setAttr, setEvent, rmEvent,
    qS, qSA, apCh, getStorage, setStorage, sendMsg, getTextContent, extractCoreUrl, getCompleteData, isObjEmpty
} from "../modules/quickMethods.js"

import elementCreator from '../modules/elementCreator'

// Import Font Awesome
// import "../assets/font-awesome/css/fontawesome.css"
// import "../assets/font-awesome/css/solid.css"
// import "../assets/font-awesome/webfonts/fa-solid-900.woff2"

// console.log("url");
// console.log(chrome.runtime.getURL('src/assets/font-awesome/css/solid.css'));
// console.log(chrome.runtime.getURL('src/assets/font-awesome/css/fontawesome.css'));

let link = document.createElement('link');
link.href = chrome.runtime.getURL('src/assets/font-awesome/css/fontawesome.css');
link.rel = 'stylesheet';
document.head.appendChild(link);

let link2 = document.createElement('link');
link2.href = chrome.runtime.getURL('src/assets/font-awesome/css/solid.css');
link2.rel = 'stylesheet';
document.head.appendChild(link2);





const mws = {

    // Set of variables to track the state of various things in order to allow or prevent actions
    currentState: {
        elementSelectionOn: false,
        elementSelectorOpen: false,
        keyboardShortcutSelectorOpen: false,
        keyboardShortcutSelectionOn: false,
    },

    // Global Variables
    currentElement: null,
    clickedElementsArray: [],
    selectedShortcut: undefined,
    shortcutName: "",
    allShortcuts: [], // {"website":["shortcut", "shortcut"]}
    allElements: [],
    keyElementRelationObject: {},

    completeData: {},
    allWebsitesData: {},

    websiteData: {
        settings: {
            enabled: true,
        },
        shortcuts: {}
    },

    websiteURL: "",


    extensionElementsInnerHTML: {
        elementSelectorDiv: null,

        keyboardShortcutSelectorDialog: null,
    },

    // DATA MANAGEMENT FUNCTIONS: These funcs get data from the storage, update the respective variable values, and update the storage 

    // Gets data from the storage and stores it in respective variables
    getExistingDataOfCurrentWebsite: async function () {

        mws.completeData = await getCompleteData()
        // console.log("I asked for data from", mws.completeData);

        mws.allWebsitesData = mws.completeData.websitesData

        if (isObjEmpty(mws.completeData) || !mws.completeData.websitesData[mws.websiteURL] || isObjEmpty(mws.completeData.websitesData[mws.websiteURL].shortcuts)) {
            console.log("Nhi h kch khaas ki aage badhe hum...");
            return
        }
        mws.websiteData = mws.allWebsitesData[mws.websiteURL]

        mws.allShortcuts = Object.keys(mws.websiteData.shortcuts) || []
        // console.log(mws.allShortcuts);

        // This logic will change when types are added
        mws.allElements = Object.values(mws.websiteData.shortcuts).map(eachShortcutObject => eachShortcutObject.selected) || []



    },

    // Sets the new data (updated variables) to storage
    setDataOfCurrentWebsite: async function () {
        let newShortcutData = {
            name: mws.shortcutName,
            enabled: true,

            // We will use mws.getSelectedType() once other types are added
            type: "singleElement",
            properties: {
                action: 'click'
            },

            selected: toJSON(mws.currentElement),
        }


        mws.websiteData.shortcuts[mws.selectedShortcut] = newShortcutData

        mws.allWebsitesData[mws.websiteURL] = mws.websiteData

        mws.completeData.websitesData = mws.allWebsitesData
        await chrome.storage.local.set({ ...mws.completeData })

    },


    // --------- EVENT FUNCTIONS ---------

    // This function will add or Remove a class to the hovered element that gives it a border 
    addRemoveborder: function (event) {
        let [x, y] = [event.x, event.y]


        if (mws.currentState.keyboardShortcutSelectorOpen) {
            return
        }
        if (!mws.currentState.elementSelectionOn) {
            return
        }

        // If currentElement already exists then remove the class
        if (mws.currentElement) {
            mws.currentElement.classList.remove('mws-bordered')
        }

        if (getElemAt(x, y).classList.contains('mws-element')) {
            mws.currentElement = undefined
            return
        }
        mws.currentElement = getElemAt(x, y);


        // mws.currentElement.classList.add('mws-bordered')
        setTextContent(qS('.mws-currentElementSpan'), finder(mws.currentElement))

        addClass(mws.currentElement, ['mws-bordered'])

        // console.log(mws.currentElement);
        // console.log(finder(mws.currentElement));

    },

    // This func tracks when a user clicks anywhere in the window, mainly used to select the clicked elements
    whenClicked: function (event) {
        if (!mws.currentElement) {
            return
        }
        const clickedElement = mws.currentElement;
        if (!mws.currentState.elementSelectionOn) {
            return

        }
        if (clickedElement.classList.contains('mws-element')) {
            return
        }
        // if (!mws.isElementFocusable(clickedElement)) {
        //     console.log("Not Focusable");
        //     return
        // }
        // console.log(mws.currentElement);

        event.preventDefault()
        event.stopPropagation()
        if (!mws.currentState.keyboardShortcutSelectorOpen) {
            rmClass(mws.currentElement, ['mws-bordered'])
            mws.openKeyboardShortcutSelectionDialog()
        }




        // This code will be there when multiple click functionality is added

        // clickedElement.classList.add("mws-clicked")
        // if (!clickedElementsArray.contains(mws.currentElement)) {
        //     clickedElementsArray.push(mws.currentElement)
        //     mws.currentElement.setAttribute('data-index', `${clickedElementsArray.length}`)
        // }

    },


    // Track keyboard key for shortcut selection when the dialog is open 
    keyboarder: function (e) {
        let pressedKey = e.key;


        if (mws.currentState.keyboardShortcutSelectionOn) {
            const keyCode = e.keyCode || e.which;

            // Check if it's a character key (alphabets and numbers)
            if ((keyCode >= 65 && keyCode <= 90) ||   // A-Z
                (keyCode >= 48 && keyCode <= 57)) {    // 0-9
                // It's a character key
                console.log('Character key pressed:', e.key);

                e.preventDefault()
                mws.selectedShortcut = pressedKey
                setTextContent(qS('.mws-selectedShortcutSpan'), `${mws.selectedShortcut}`)
            }
        }
    },

    //  As the name says, this func disables unloading (reload or closing) of a tab. 
    //  It doesn't DISABLES it actually, instead PREVENT it from happening and asks for a confirmation 
    disableWindowUnload: function (e) {
        console.log("Yoo it's me the unload stopperrr");
        // Cancel the event (prevent the browser from closing or reloading the page)
        e.preventDefault();
        // Chrome requires the following line to work
        e.returnValue = "";
    },

    pauseResumeSelection: (e) => {
        if (mws.currentState.elementSelectionOn) {
            // e.preventDefault()
            console.log(e);
            if (e.type == "keydown") {
                // keyCode of both ControlLeft and ControlRight is 17, bcoz obv both are Control keys
                if (e.keyCode == 17) {
                    window.removeEventListener('mouseover', mws.addRemoveborder);
                }

            }
            if (e.type == "keyup") {
                if (e.keyCode == 17) {
                    window.addEventListener('mouseover', mws.addRemoveborder);
                }
            }

        }
    },

    // Turner Functions: These functions add or remove events from window/DOM elements

    turnOnKeyboardEvents: () => {
        window.addEventListener('keydown', mws.keyboarder)
        window.addEventListener('keydown', mws.pauseResumeSelection)
        window.addEventListener('keyup', mws.pauseResumeSelection)

    },
    turnOffKeyboardEvents: () => {
        window.removeEventListener('keydown', mws.keyboarder)

        window.removeEventListener('keydown', mws.pauseResumeSelection)
        window.removeEventListener('keyup', mws.pauseResumeSelection)
    },



    turnOnWindowUnloadStopper: function () {
        console.log("No you cannot unload");
        window.addEventListener("beforeunload", mws.disableWindowUnload);
    },
    turnOffWindowUnloadStopper: function () {
        console.log("Yes you can unload");
        window.removeEventListener("beforeunload", mws.disableWindowUnload);
    },



    // HELPER FUNCTIONS: These functions are used by other functions in order to do a specific task like 

    getSelectedType: function () {

        // Get a reference to the radio button group by its name
        const radioGroup = document.getElementsByName("elementSelectionType");

        // Initialize a variable to store the selected value
        let selectedValue;

        // Iterate through the radio buttons
        for (const radio of radioGroup) {
            if (radio.checked) {
                // If a radio button is checked, store its value
                selectedValue = radio.value;
                break; // Exit the loop since we found the selected radio
            }
        }
        return selectedValue
    },

    enableNameSetting: function () {
        mws.currentState.keyboardShortcutSelectionOn = false;
        // mws.turnOffKeyboardEvents()
        const nameInput = qS('.mws-shortcutNameInput')
        nameInput.disabled = false

        setEvent(nameInput, "keyup", (e) => {
            mws.shortcutName = nameInput.value
        })

    },



    keyboardShortcutValidator: function (newShortcut) {
        // This function will be updated a lot with time as we get to know shortcuts that are causing issues for MOST of the users.
        // Note that there will be specific issues for every user which they need to solve themselves. But there are a few shortcuts
        // that are universally used for something and can be an issue. 
        return true

    },
    openKeyboardShortcutSelectionDialog: function () {
        mws.turnOnKeyboardEvents()

        mws.currentState.keyboardShortcutSelectorOpen = true;
        mws.currentState.keyboardShortcutSelectionOn = true;
        let dialogElementData = {
            tagName: 'dialog',
            attributes: {
                classes: ['mws-element', 'mws-keyboardShortcutSelectionDialog']
            },
            // childElements: [spanElement, buttonElement]
            innerHTML: mws.extensionElementsInnerHTML.keyboardShortcutSelectorDialog
        }
        let dialogElement = elementCreator(dialogElementData)
        document.body.appendChild(dialogElement)

        const selectionDoneButton = qS('.mws-shortcutSelectionDoneButton')

        selectionDoneButton.addEventListener('click', (e) => {
            e.preventDefault()
            if (mws.selectedShortcut == undefined) { return }

            if (!mws.allShortcuts.includes(mws.selectedShortcut) && mws.keyboardShortcutValidator(mws.selectedShortcut)) {
                mws.allShortcuts.push(mws.selectedShortcut)
                mws.enableNameSetting()
            }
        })

        qS('.mws-allDoneButton').addEventListener('click', async (e) => {
            e.preventDefault()

            // await mws.getExistingDataOfCurrentWebsite()
            await mws.setDataOfCurrentWebsite()

            rmClass(mws.currentElement, ['mws-bordered'])
            mws.currentElement = undefined;

            mws.closeKeyboardShortcutSelectionDialog()
        })

        setEvent(qS('.mws-closeKeyboardShortcutSelectionDialogButton'), 'click', (event) => {
            rmClass(mws.currentElement, ['mws-bordered'])
            mws.currentElement = undefined;

            mws.closeKeyboardShortcutSelectionDialog()
        })

        dialogElement.showModal()
    },

    closeKeyboardShortcutSelectionDialog: function () {
        // mws.switchOffSelector()
        const dialogElement = qS('.mws-keyboardShortcutSelectionDialog')
        mws.currentState.keyboardShortcutSelectorOpen = false;
        mws.currentState.keyboardShortcutSelectionOn = false;
        document.body.removeChild(dialogElement)

        // mws.openFloatingDiv()
    },

    isElementFocusable: function (element) {
        // console.log(element.focusable);
        if (element.focusable) {
            return true;
        }
        // Check if the element has a tabIndex property
        // console.log(element.tabIndex >= -1);
        if (typeof element.tabIndex === 'number') {
            // Elements with a tabIndex greater than or equal to -1 are focusable
            return element.tabIndex >= -1;
        }

        // If the element does not have a tabIndex property, check its nodeName
        const nodeName = element.nodeName.toLowerCase();
        const focusableNodeNames = ['a', 'button', 'input', 'select', 'textarea'];
        // const unFocusableNodeNames = ['a', 'button', 'input', 'select', 'textarea'];
        console.log((focusableNodeNames.includes(nodeName)));
        if (focusableNodeNames.includes(nodeName)) {
            return true;
        }

    },

    // This function changes the state variable provided to it AND  updates the DOM, content & CSS of Elements created by mws(this extension) accordingly 
    changeStateAndUpdateDOM: (changedStateVariable = "") => {

        // These are functions that will be executed on a specific state variable changes 
        const reactionForStateChange = {
            elementSelectionOn: () => {
                // setTextContent(qS('.mws-elementSelectionEnableDisableButton'), mws.currentState[changedStateVariable] ? "On" : "Off")
                // console.log(qS('.mws-toggleSwitchInput'));
                if (qS('.mws-disableElementSelectionToggle-wrapper .mws-toggleSwitchInput')) {
                    qS('.mws-disableElementSelectionToggle-wrapper .mws-toggleSwitchInput').checked = mws.currentState[changedStateVariable] ? true : false
                }
            }
        }
        if (changedStateVariable) {
            mws.currentState[changedStateVariable] = !mws.currentState[changedStateVariable]
            reactionForStateChange[changedStateVariable]()
        }


    },


    // These functions (switchOffSelector, switchOnSelector) enable or disable the selection of elements,
    // they enable/disable the hover and click events and add/remove the extension's CSS classes to/from the DOM.
    switchOffSelector: function () {
        mws.currentElement = undefined
        rmClass(qS('html'), ['mws-stylesForPage'])

        window.removeEventListener('mouseover', mws.addRemoveborder);
        window.removeEventListener('click', mws.whenClicked);

        mws.changeStateAndUpdateDOM("elementSelectionOn")
    },
    switchOnSelector: function () {
        addClass(qS('html'), ['mws-stylesForPage'])

        window.addEventListener('mouseover', mws.addRemoveborder);
        window.addEventListener('click', mws.whenClicked);


        mws.changeStateAndUpdateDOM("elementSelectionOn")
    },
    // The function to trigger switchOnSelector or switchOffSelector depending on mws.currentState.elementSelectionOn
    switchSelector: () => {
        if (mws.currentState.elementSelectionOn) {
            mws.switchOffSelector()
        }
        else {
            mws.switchOnSelector()
        }
    },

    closeFloatingDiv: () => {
        document.body.removeChild(qS('.mws-floating-wrapper'))
    },

    makeElementDraggable: function (element) {

        let offsetX, offsetY;

        const move = (e) => {
            e.preventDefault()
            element.style.left = `${e.x - offsetX}px`
            element.style.top = `${e.y - offsetY}px`
            // mws.switchOffSelector()
        }
        element.addEventListener("mousedown", (e) => {
            offsetX = e.x - element.offsetLeft;
            offsetY = e.y - element.offsetTop;
            document.addEventListener("mousemove", move)

            // setEvent(document, "mousemove", move)
        })
        function mouseUpFunc() {
            rmEvent(document, "mousemove", move)
            // mws.switchOnSelector()
        }
        document.addEventListener("mouseup", mouseUpFunc)

        // element.addEventListener('mouseleave', ()=>{
        //     document.removeEventListener("mouseup", mouseUpFunc)
        // })
    },


    openFloatingDiv: async function () {



        const elementSelectorHTMLFileURL = chrome.runtime.getURL('src/scripts/elementSelector.html');
        await fetch(elementSelectorHTMLFileURL)
            .then(response => response.text())
            .then(html => {
                mws.extensionElementsInnerHTML.elementSelectorDiv = html
            });

        const keySelectorHTMLFileURL = chrome.runtime.getURL('src/scripts/keySelector.html');
        await fetch(keySelectorHTMLFileURL)
            .then(response => response.text())
            .then(html => {
                mws.extensionElementsInnerHTML.keyboardShortcutSelectorDialog = html
            });

        let floatingDivData = {
            tagName: 'div',
            attributes: {
                classes: ['mws-element', 'mws-floating-wrapper']
            },
            innerHTML: mws.extensionElementsInnerHTML.elementSelectorDiv
        }
        let floatingDiv = elementCreator(floatingDivData)

        function addClassToChildElements(parentElement, className) {
            // Get all child elements of the parent element
            const childElements = parentElement.querySelectorAll('*');

            // Add the specified class to each child element
            childElements.forEach((child) => {
                child.classList.add(className);
            });
        }
        addClassToChildElements(floatingDiv, 'mws-element');

        document.body.appendChild(floatingDiv)

        mws.makeElementDraggable(floatingDiv)

        mws.currentState.elementSelectorOpen = true

        function enableDisableElementSelection() {
            if (mws.currentState.elementSelectionOn) {
                // mws.currentState.elementSelectionOn = false
                // setTextContent(qS('.mws-elementSelectionEnableDisableButton'), "Off")
                mws.switchOffSelector()
            }
            else {
                // setTextContent(qS('.mws-elementSelectionEnableDisableButton'), "On")
                // mws.currentState.elementSelectionOn = true
                mws.switchOnSelector()
            }
            // setTextContent(qS('.mws-elementSelectionEnableDisableButton'), mws.currentState.elementSelectionOn ? "On" : "Off")

        }
        console.log(qS('.mws-elementSelectionEnableDisableButton'));

        setEvent(qS('.mws-toggleSwitchInput'), 'change', mws.switchSelector)

        function closeElementSelectorAndTurnOffElementSelection() {
            mws.turnOffEverything()
            // mws.closeFloatingDiv()

        }
        console.log(qS('.mws-closeElementSelectorButton'));
        setEvent(qS('.mws-closeElementSelectorButton'), 'click', closeElementSelectorAndTurnOffElementSelection)

        console.log(qS('.mws-selectElementButton'));
        setEvent(qS('.mws-selectElementButton'), 'click', ()=>{
            rmClass(mws.currentElement, ['mws-bordered'])
            mws.openKeyboardShortcutSelectionDialog()
        })

        // dialogElement.showModal()


    },


    turnOffEverything: async function () {
        await sendMsg({ msg: "selectorDisabled", spread: true })

        mws.turnOffWindowUnloadStopper()

        mws.switchOffSelector()
        mws.turnOffKeyboardEvents()

        if (mws.currentElement) {
            rmClass(mws.currentElement, ['mws-bordered'])
        }
        // console.log(mws.currentState.elementSelectorOpen);
        if (mws.currentState.elementSelectorOpen) {
            mws.closeFloatingDiv()
        }


    },
    turnOnEverything: async function () {
        mws.websiteURL = extractCoreUrl(window.location.href)
        await mws.getExistingDataOfCurrentWebsite()

        await sendMsg({ msg: "selectorEnabled", spread: true })




        // mws.turnOnWindowUnloadStopper()
        mws.switchOnSelector()

        mws.turnOnKeyboardEvents()

        mws.openFloatingDiv()


    },



    init: async function () {

        // mws.websiteURL = extractCoreUrl(window.location.href)
        // console.log(mws.websiteURL);


        // sendMsg({ msg: "selectorEnabled", spread: true })

        // mws.turnOnWindowUnloadStopper()

        // await mws.getExistingDataOfCurrentWebsite()
        // mws.switchOnSelector()
        // mws.turnOnKeyboardEvents()

        // mws.openFloatingDiv()


        mws.turnOnEverything()

        chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
            if (message.action === "turnOffSelector") {
                console.log("Msg aaya to band hora huuuu");
                mws.turnOffEverything()
            }
            if (message.action === "turnOnSelector") {
                console.log("Msg aaya to start hora huuuu");
                mws.turnOnEverything()
            }
        });

    }
}

mws.init()


chrome.storage.onChanged.addListener(async (changes) => {
    console.log("Updating SETTER data");

    await mws.getExistingDataOfCurrentWebsite()
})