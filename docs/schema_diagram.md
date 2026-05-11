```mermaid
erDiagram
  guilds {
    text guild_id PK "not null"
    timestamp created_at "not null"
    timestamp updated_at "not null"
    timestamp joined_at "not null"
    timestamp left_at
  }

  guild_settings {
    text guild_id PK "not null"
    timestamp created_at "not null"
    timestamp updated_at "not null"
    text mod_role_id
    text archive_channel_id
  }

  member_profiles {
    text guild_id PK "not null"
    text user_id PK "not null"
    timestamp created_at "not null"
    timestamp updated_at "not null"
    text bio "not null"
  }

  guild_settings }o--|| guilds : "guild_id"
  member_profiles }o--|| guilds : "guild_id"
```
