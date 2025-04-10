const http = require('http'); // Built-in HTTP module
const fs = require('fs').promises; // Use promises version of fs for async/await
const url = require('url');   // Built-in URL module

// Initial list
let items = [];

// Load items from file on startup with error handling
async function loadItems() {
    try {
        const data = await fs.readFile('data.txt', 'utf8');
        items = data.split('\n').filter(item => item.trim() !== '');
        console.log('Items loaded successfully from data.txt');
    } catch (err) {
        if (err.code === 'ENOENT') {
            console.log('data.txt not found, starting with empty list');
            await fs.writeFile('data.txt', ''); // Create the file if it doesn't exist
        } else {
            console.error('Error loading items:', err.message);
        }
    }
}

// Start loading items when the server starts
loadItems();

// Create the HTTP server
const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    const query = parsedUrl.query;

    // Helper function to send HTML response
    const sendHtmlResponse = (statusCode, html) => {
        res.writeHead(statusCode, { 'Content-Type': 'text/html' });
        res.write(html);
        res.end();
    };

    // Serve the HTML page (GET /)
    if (pathname === '/' && req.method === 'GET') {
        try {
            const html = `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Node.js To-Do List</title>
                    <style>
                        body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 20px; text-align: center; }
                        .container { max-width: 500px; margin: 0 auto; padding: 20px; background-color: #fff; border-radius: 8px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1); }
                        input[type="text"] { padding: 8px; width: 70%; border: 1px solid #ddd; border-radius: 4px; }
                        button { padding: 8px 16px; background-color: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; }
                        button:hover { background-color: #45a049; }
                        ul { list-style-type: none; padding: 0; text-align: left; }
                        li { padding: 10px; border-bottom: 1px solid #eee; }
                        .error { color: red; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1>Node.js To-Do List</h1>
                        <form action="/add" method="POST">
                            <input type="text" name="item" placeholder="Enter a new task" required>
                            <button type="submit">Add Task</button>
                        </form>
                        <ul>
                            ${items.map(item => `<li>${item}</li>`).join('')}
                        </ul>
                    </div>
                </body>
                </html>
            `;
            sendHtmlResponse(200, html);
        } catch (err) {
            console.error('Error generating HTML:', err.message);
            sendHtmlResponse(500, '<h1>500 Internal Server Error</h1><p>Something went wrong on the server.</p>');
        }
    }

    // Handle form submission (POST /add)
    else if (pathname === '/add' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });

        req.on('end', async () => {
            try {
                const item = new URLSearchParams(body).get('item');
                if (!item || item.trim() === '') {
                    throw new Error('Item cannot be empty');
                }

                items.push(item.trim()); // Add to in-memory list
                await fs.appendFile('data.txt', item.trim() + '\n'); // Append to file
                res.writeHead(302, { 'Location': '/' }); // Redirect to home
                res.end();
            } catch (err) {
                console.error('Error adding item:', err.message);
                sendHtmlResponse(400, `
                    <h1>400 Bad Request</h1>
                    <p class="error">${err.message}</p>
                    <a href="/">Go Back</a>
                `);
            }
        });

        // Handle request errors (e.g., stream issues)
        req.on('error', (err) => {
            console.error('Request error:', err.message);
            sendHtmlResponse(500, '<h1>500 Internal Server Error</h1><p>Request processing failed.</p>');
        });
    }

    // Handle 404 for unknown routes
    else {
        sendHtmlResponse(404, `
            <h1>404 Not Found</h1>
            <p>The requested resource was not found on this server.</p>
            <a href="/">Go Back</a>
        `);
    }
});

// Start the server with error handling
const PORT = 3000;
server.listen(PORT, (err) => {
    if (err) {
        console.error('Failed to start server:', err.message);
    } else {
        console.log(`Server running at http://localhost:${PORT}`);
    }
});

// Handle uncaught exceptions to prevent server crash
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err.message);
    // Optionally, you could gracefully shut down the server here
    // server.close(() => process.exit(1));
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});