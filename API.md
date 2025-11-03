# API Documentation

Complete API reference for Woo Reading Notes.

## Base URL

```
http://localhost:3000  # Development
https://app.example.com  # Production
```

## Authentication

The API uses **Supabase authentication** with Row-Level Security (RLS).

### How Authentication Works

1. User authenticates via Supabase Auth UI
2. JWT token stored in browser
3. All requests automatically include token via headers
4. Server validates token and applies RLS policies

### Public Access

Some endpoints support public read access:
- `/api/graph` - Public graph visualization (if enabled)
- Health checks - No authentication required

## Endpoints

### Books

#### Search Books (External API)

Search for books using the Aladin Books API (Korean books).

```
GET /api/books?query={query}&page={page}&size={size}&provider=aladin
```

**Parameters**:
| Name | Type | Required | Default | Notes |
|------|------|----------|---------|-------|
| query | string | Yes | - | Search term (title, author, ISBN) |
| page | number | No | 1 | Result page (1-based) |
| size | number | No | 10 | Results per page (max 50) |
| provider | string | No | aladin | Only 'aladin' supported |

**Request**:
```bash
curl "http://localhost:3000/api/books?query=데미안&page=1&size=10"
```

**Response** (200 OK):
```json
{
  "items": [
    {
      "title": "Book Title",
      "authors": ["Author Name"],
      "publisher": "Publisher Name",
      "publishedAt": "20250101",
      "isbn": "9781234567890",
      "isbn13": "9781234567890",
      "thumbnail": "https://...",
      "sourceUrl": "https://..."
    }
  ],
  "isEnd": false,
  "page": 1,
  "size": 10,
  "query": "데미안"
}
```

**Error Response** (400 Bad Request):
```json
{
  "error": "query is required"
}
```

**Rate Limiting**:
- 30 requests per minute per IP/query combination
- Returns 429 Too Many Requests when exceeded

---

#### Get User's Books

Fetch all books for authenticated user.

```
GET /api/user/books
```

**Headers**:
```
Authorization: Bearer {jwt_token}
```

**Query Parameters**:
| Name | Type | Default | Notes |
|------|------|---------|-------|
| limit | number | 20 | Items per page |
| offset | number | 0 | Pagination offset |
| sort | string | updated_at | Sort field (title, rating, created_at) |
| order | string | desc | asc or desc |
| search | string | - | Search by title/author |
| tags | string | - | Comma-separated tag IDs |
| rating_min | number | - | Minimum rating (0-5) |

**Request**:
```bash
curl -H "Authorization: Bearer $JWT" \
  "http://localhost:3000/api/user/books?limit=20&sort=rating&order=desc"
```

**Response** (200 OK):
```json
{
  "books": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "The Great Gatsby",
      "author": "F. Scott Fitzgerald",
      "publisher": "Charles Scribner's Sons",
      "published_year": 1925,
      "isbn": "9780743273565",
      "rating": 5,
      "progress": 100,
      "summary": "A classic novel...",
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-01-02T00:00:00Z"
    }
  ],
  "total": 42,
  "limit": 20,
  "offset": 0
}
```

---

#### Create Book

Add a new book to user's library.

```
POST /api/books
```

**Headers**:
```
Authorization: Bearer {jwt_token}
Content-Type: application/json
```

**Request Body**:
```json
{
  "title": "Book Title",
  "author": "Author Name",
  "publisher": "Publisher Name",
  "published_year": 2025,
  "isbn": "9781234567890",
  "rating": 4,
  "progress": 50,
  "summary": "Brief description..."
}
```

**Required Fields**: title
**Optional Fields**: author, publisher, published_year, isbn, rating, progress, summary

**Response** (201 Created):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Book Title",
  "author": "Author Name",
  "rating": 4,
  "progress": 50,
  "created_at": "2025-01-03T00:00:00Z",
  "updated_at": "2025-01-03T00:00:00Z"
}
```

**Error Response** (400 Bad Request):
```json
{
  "error": "Invalid input",
  "details": "title is required"
}
```

---

#### Update Book

Update an existing book.

```
PATCH /api/books/{id}
```

**Headers**:
```
Authorization: Bearer {jwt_token}
Content-Type: application/json
```

**Request Body**:
```json
{
  "rating": 5,
  "progress": 100,
  "summary": "Updated summary..."
}
```

**Response** (200 OK):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Book Title",
  "rating": 5,
  "progress": 100,
  "updated_at": "2025-01-03T01:00:00Z"
}
```

---

#### Delete Book

Remove a book from library.

```
DELETE /api/books/{id}
```

**Headers**:
```
Authorization: Bearer {jwt_token}
```

**Response** (204 No Content):
```
(empty body)
```

---

### Notes

#### Get Book Notes

Fetch all notes for a specific book.

```
GET /api/books/{bookId}/notes
```

**Headers**:
```
Authorization: Bearer {jwt_token}
```

**Response** (200 OK):
```json
{
  "notes": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "title": "Key Quote",
      "content": "Chapter passage analysis...",
      "location": "Chapter 3, Page 42",
      "highlight_color": "yellow",
      "created_at": "2025-01-01T00:00:00Z"
    }
  ]
}
```

---

#### Create Note

Add a note to a book.

```
POST /api/books/{bookId}/notes
```

**Headers**:
```
Authorization: Bearer {jwt_token}
Content-Type: application/json
```

**Request Body**:
```json
{
  "title": "Key Quote",
  "content": "The great quote from the book...",
  "location": "Chapter 3, Page 42",
  "highlight_color": "yellow"
}
```

**Response** (201 Created):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "title": "Key Quote",
  "content": "The great quote...",
  "location": "Chapter 3, Page 42",
  "highlight_color": "yellow",
  "created_at": "2025-01-03T00:00:00Z"
}
```

---

### Tags

#### Get All Tags

Fetch all tags for authenticated user.

```
GET /api/tags
```

**Headers**:
```
Authorization: Bearer {jwt_token}
```

**Response** (200 OK):
```json
{
  "tags": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440002",
      "name": "fiction",
      "created_at": "2025-01-01T00:00:00Z"
    }
  ]
}
```

---

#### Create Tag

Create a new tag.

```
POST /api/tags
```

**Headers**:
```
Authorization: Bearer {jwt_token}
Content-Type: application/json
```

**Request Body**:
```json
{
  "name": "science-fiction"
}
```

**Response** (201 Created):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440002",
  "name": "science-fiction",
  "created_at": "2025-01-03T00:00:00Z"
}
```

**Constraint**: Tag names must be unique per user

---

#### Add Tag to Book

Associate a tag with a book.

```
POST /api/books/{bookId}/tags/{tagId}
```

**Headers**:
```
Authorization: Bearer {jwt_token}
```

**Response** (201 Created):
```json
{
  "book_id": "550e8400-e29b-41d4-a716-446655440000",
  "tag_id": "550e8400-e29b-41d4-a716-446655440002"
}
```

---

### Graph

#### Get Knowledge Graph

Fetch graph data for visualization.

```
GET /api/graph?public={boolean}
```

**Parameters**:
| Name | Type | Default | Notes |
|------|------|---------|-------|
| public | boolean | false | Include public shares only |

**Response** (200 OK):
```json
{
  "nodes": [
    {
      "data": {
        "id": "book-uuid",
        "label": "Book Title",
        "type": "book"
      }
    }
  ],
  "edges": [
    {
      "data": {
        "source": "book-uuid",
        "target": "entity-uuid",
        "label": "mentions"
      }
    }
  ]
}
```

---

### Auth

#### Get Current User

Fetch authenticated user info.

```
GET /api/auth/me
```

**Headers**:
```
Authorization: Bearer {jwt_token}
```

**Response** (200 OK):
```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "user_metadata": {
      "name": "User Name"
    }
  },
  "profile": {
    "full_name": "User Name",
    "created_at": "2025-01-01T00:00:00Z"
  }
}
```

**Error Response** (401 Unauthorized):
```json
{
  "error": "Unauthorized"
}
```

---

### Visits (Public)

#### Record Page Visit

Track page visits (no authentication required).

```
POST /api/visits
```

**Request Body**:
```json
{
  "page": "/library",
  "referrer": "https://example.com",
  "user_agent": "Mozilla/5.0..."
}
```

**Response** (201 Created):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2025-01-03T00:00:00Z"
}
```

---

## Error Handling

### Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| 200 | OK | Request successful |
| 201 | Created | Resource created |
| 204 | No Content | Deletion successful |
| 400 | Bad Request | Invalid parameters |
| 401 | Unauthorized | Missing/invalid token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 429 | Too Many Requests | Rate limited |
| 500 | Server Error | Internal error |

### Error Response Format

```json
{
  "error": "Error message",
  "details": "Additional context",
  "code": "ERROR_CODE"
}
```

---

## Rate Limiting

### Limits

- **Book Search**: 30 requests per minute per IP
- **API Requests**: 1000 requests per hour per user
- **Burst**: Up to 100 requests per minute

### Headers

```
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 29
X-RateLimit-Reset: 1609459200
```

---

## Pagination

Large result sets use cursor-based pagination:

```json
{
  "data": [...],
  "pagination": {
    "total": 100,
    "limit": 20,
    "offset": 0,
    "has_more": true,
    "cursor": "next_page_token"
  }
}
```

---

## Testing APIs

### Using curl

```bash
# Search books
curl "http://localhost:3000/api/books?query=test"

# With authentication
curl -H "Authorization: Bearer $JWT_TOKEN" \
  "http://localhost:3000/api/auth/me"
```

### Using Postman

1. Create environment with variables:
   - `base_url`: http://localhost:3000
   - `jwt_token`: Your JWT token

2. Import requests and run collections

3. Export collection for sharing

---

## Webhooks (Future)

Planned webhook events:
- `book.created` - New book added
- `book.updated` - Book updated
- `note.created` - Note added
- `tag.created` - Tag created

---

## Changelog

### v1.0.0 (Current)
- Book CRUD operations
- Notes management
- Tags system
- Graph API
- User authentication

---

**Last Updated**: 2025-01-03
**Maintainer**: Development Team
