# PostgreSQL MCP Setup for GitHub Copilot

## Installation Failed with pipx

Unfortunately, `pipx install postgres-mcp` failed due to a compilation error with the `pglast` dependency. This is a common issue on some systems.

## Recommended Solution: Use Docker Instead

Docker is the easiest and most reliable way to run postgres-mcp:

### 1. Pull the Docker Image

```bash
docker pull crystaldba/postgres-mcp
```

### 2. Configure VS Code Settings

Since you're using GitHub Copilot in VS Code, you need to add the MCP configuration to your VS Code settings.

**Note:** GitHub Copilot doesn't natively support MCP servers yet. However, you have a few options:

#### Option A: Use with Claude Desktop (Recommended)

If you have Claude Desktop, configure it in:

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

Add this configuration:

```json
{
  "mcpServers": {
    "postgres": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-e",
        "DATABASE_URI",
        "crystaldba/postgres-mcp",
        "--access-mode=unrestricted"
      ],
      "env": {
        "DATABASE_URI": "postgresql://username:password@localhost:5432/dbname"
      }
    }
  }
}
```

#### Option B: Use with Cursor IDE

If you're using Cursor, open the MCP settings from:

- Command Palette → "Cursor Settings" → "MCP" tab

Add this configuration to the MCP settings file:

```json
{
  "mcpServers": {
    "postgres": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-e",
        "DATABASE_URI",
        "crystaldba/postgres-mcp",
        "--access-mode=unrestricted"
      ],
      "env": {
        "DATABASE_URI": "postgresql://username:password@localhost:5432/dbname"
      }
    }
  }
}
```

### 3. Update Your Database Connection

Replace `postgresql://username:password@localhost:5432/dbname` with your actual database credentials:

- **username**: Your PostgreSQL username
- **password**: Your PostgreSQL password
- **localhost**: Your database host
- **5432**: Your database port
- **dbname**: Your database name

Example:

```
postgresql://myuser:mypass@localhost:5432/mydatabase
```

### 4. Access Modes

- **unrestricted**: Full read/write access (for development)
- **restricted**: Read-only mode (for production)

To use restricted mode, change `--access-mode=unrestricted` to `--access-mode=restricted`

## Alternative: Try Using uv Instead of pipx

If you still want to try the Python installation:

```bash
# Install uv
curl -LsSf https://astral.sh/uv/install.sh | sh

# Install postgres-mcp
uv pip install postgres-mcp

# Then configure with:
{
  "mcpServers": {
    "postgres": {
      "command": "postgres-mcp",
      "args": [
        "--access-mode=unrestricted"
      ],
      "env": {
        "DATABASE_URI": "postgresql://username:password@localhost:5432/dbname"
      }
    }
  }
}
```

## Features

Once configured, you'll be able to:

- 🔍 **Database Health Checks** - Analyze indexes, connections, buffer cache, vacuum health
- ⚡ **Index Tuning** - Get intelligent index recommendations
- 📈 **Query Plans** - Review EXPLAIN plans and optimize queries
- 🧠 **Schema Intelligence** - Context-aware SQL generation
- 🛡️ **Safe SQL Execution** - Read-only mode for production safety

## Troubleshooting

### Docker Daemon Not Running

If you see "Cannot connect to the Docker daemon", you need to start Docker Desktop:

```bash
# Start Docker Desktop
open -a Docker

# Wait for Docker to start, then pull the image
docker pull crystaldba/postgres-mcp
```

### pipx Installation Failed

The `pipx install postgres-mcp` method fails due to `pglast` compilation errors on many systems. **Use the Docker method instead** - it's more reliable and doesn't require compilation.

## Need Help?

- Documentation: https://github.com/crystaldba/postgres-mcp
- Discord: https://discord.gg/4BEHC7ZM
