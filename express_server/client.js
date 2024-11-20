// Import required dependencies
var ReconnectingWebSocket = require('reconnecting-websocket');
var sharedb = require('sharedb/lib/client');
var richText = require('rich-text');
var Quill = require('quill/dist/quill.js');
var QuillCursors = require('quill-cursors');
var tinycolor = require('tinycolor2');
require('dotenv').config(); 

// Register the rich-text type with ShareDB
sharedb.types.register(richText.type);
Quill.register('modules/cursors', QuillCursors);

// Main logic
// Adjusted client.js
document.addEventListener('DOMContentLoaded', function () {
    console.log("Client script loaded!");

    const padId = window.padId;
    const username = window.username || "Anonymous"; // Get username from Flask
    const userColor = tinycolor.random().toHexString();

    if (!padId) {
        console.error("Pad ID (window.padId) is not defined.");
        return;
    }

  const socket = new ReconnectingWebSocket(`${process.env.EXPRESS_WS_URL}/?padId=${encodeURIComponent(window.padId)}`);
  const connection = new sharedb.Connection(socket);
  const doc = connection.get('examples', padId);

  doc.subscribe(function (err) {
      if (err) {
          console.error("Error subscribing to document:", err);
          return;
      }
      console.log("Document loaded:", doc.data);
      initializeQuill(doc);
  });

  function initializeQuill(doc) {
    const quill = new Quill('#editor', {
        theme: 'snow',
        modules: {
            toolbar: [
                // Toolbar options
                [{ 'font': [] }, { 'size': ['small', false, 'large', 'huge'] }],
                ['bold', 'italic', 'underline', 'strike'],
                [{ 'color': [] }, { 'background': [] }],
                [{ 'align': [] }],
                [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                [{ 'indent': '-1' }, { 'indent': '+1' }],
                [{ 'script': 'sub' }, { 'script': 'super' }],
                ['blockquote', 'code-block'],
                ['link', 'image', 'video'],
                ['clean'],
            ],
            cursors: true, // Enable collaborative cursors
        },
        placeholder: 'Start typing...',
    });

    // Apply styling and scrollbar for the editor
    const editorContainer = document.querySelector('#editor');
    const toolbarContainer = document.querySelector('.ql-toolbar');
    const editorContent = document.querySelector('.ql-container');

    // Remove borders and shadows
    toolbarContainer.style.border = 'none';
    toolbarContainer.style.boxShadow = 'none';
    editorContent.style.border = 'none';
    editorContent.style.boxShadow = 'none';
    editorContainer.style.marginBottom = '10px';

    // Ensure the editor blends with the background
    editorContent.style.backgroundColor = 'transparent';
    editorContainer.style.backgroundColor = 'transparent';


    const cursors = quill.getModule('cursors');

    // Connect to ShareDB presence
    const presence = doc.connection.getDocPresence('examples', padId);
    presence.subscribe(function (error) {
        if (error) console.error("Presence subscription error:", error);
    });

    // Create local presence
    const localPresence = presence.create(username);

    // Update cursor position on selection change or text change
    function updateCursorPosition() {
        const range = quill.getSelection();
        if (range) {
            localPresence.submit({
                range: range,
                name: username,
                color: userColor,
            });
        }
    }

    // Listen for both selection-change and text-change events
    quill.on('selection-change', function (range, oldRange, source) {
        if (source === 'user') {
            updateCursorPosition();
        }
    });

    quill.on('text-change', function (delta, oldDelta, source) {
        if (source === 'user') {
            updateCursorPosition();
        }
    });

    // Listen for remote presence updates
    presence.on('receive', function (id, data) {
        if (!data || id === username) return; // Ignore local updates
        cursors.createCursor(id, data.name, data.color);
        cursors.moveCursor(id, data.range);
    });

    // Load document content or initialize empty
    quill.setContents(doc.data || { ops: [{ insert: '\n' }] });

    // Track local changes and submit to ShareDB
    quill.on('text-change', function (delta, oldDelta, source) {
        if (source !== 'user') return;
        doc.submitOp(delta, function (err) {
            if (err) console.error("Error submitting operation:", err);
        });
    });

    // Handle remote changes
    doc.on('op', function (op, source) {
        if (source) return;
        quill.updateContents(op);
    });

    console.log("Quill editor initialized with real-time cursors and typing synchronization.");
}

});
