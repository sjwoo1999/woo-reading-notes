# API Documentation

## Base URL

\`\`\`
https://woo-reading-notes.vercel.app/api
\`\`\`

## Authentication

모든 API 요청은 Bearer token을 사용한 인증이 필요합니다:

\`\`\`bash
Authorization: Bearer [access_token]
\`\`\`

## Notes API

### 1. Get All Notes

**Endpoint**: \`GET /notes\`

**Headers**:
\`\`\`
Authorization: Bearer [token]
\`\`\`

**Response**:
\`\`\`json
{
  "notes": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "title": "노트 제목",
      "type": "book|concept|quote",
      "content": "노트 내용",
      "tags": ["tag1", "tag2"],
      "metadata": {},
      "created_at": "2025-11-04T00:00:00Z",
      "updated_at": "2025-11-04T00:00:00Z",
      "deleted_at": null
    }
  ],
  "count": 10
}
\`\`\`

### 2. Create Note

**Endpoint**: \`POST /notes\`

**Request Body**:
\`\`\`json
{
  "title": "노트 제목",
  "type": "book",
  "content": "노트 내용",
  "tags": ["tag1", "tag2"],
  "metadata": {}
}
\`\`\`

### 3. Update Note

**Endpoint**: \`PATCH /notes/[id]\`

### 4. Delete Note

**Endpoint**: \`DELETE /notes/[id]\`

### 5. Search Notes

**Endpoint**: \`GET /notes/search?q=query&type=book&sort=relevance&page=1\`

### 6. Autocomplete

**Endpoint**: \`GET /notes/autocomplete?q=query&limit=10\`

## Reminders API

### 1. Get Due Reminders

**Endpoint**: \`GET /reminders?status=pending&limit=10\`

### 2. Create Reminder

**Endpoint**: \`POST /reminders\`

**Request Body**:
\`\`\`json
{
  "note_id": "uuid",
  "interval_level": 0
}
\`\`\`

### 3. Update Reminder

**Endpoint**: \`PATCH /reminders/[id]\`

**Request Body**:
\`\`\`json
{
  "status": "completed"
}
\`\`\`

### 4. Delete Reminder

**Endpoint**: \`DELETE /reminders/[id]\`

## Graph API

### Get Graph Data

**Endpoint**: \`GET /graph?type=book\`

**Response**:
\`\`\`json
{
  "nodes": [{ "data": { "id": "uuid", "label": "title", "type": "book" } }],
  "edges": [{ "data": { "id": "id", "source": "uuid", "target": "uuid" } }],
  "stats": {
    "total_nodes": 10,
    "total_edges": 15,
    "density": 0.1667
  }
}
\`\`\`

## Links API

### Get All Links

**Endpoint**: \`GET /links\`

### Create Link

**Endpoint**: \`POST /links\`

**Request Body**:
\`\`\`json
{
  "source_note_id": "uuid",
  "target_note_id": "uuid",
  "relationship_type": "relates_to"
}
\`\`\`

### Delete Link

**Endpoint**: \`DELETE /links/[id]\`

---

**API Version**: 1.0.0
**Last Updated**: 2025-11-04
