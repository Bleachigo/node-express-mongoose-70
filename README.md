# Express Server with Mongoose

A student project using Node.js, Express 5, MongoDB Atlas and **Mongoose**. It started on the official `mongodb` driver; in this homework every database access was moved to Mongoose models. The app is an MVC-style REST API with session login (Passport), users, and a `balloons` demo collection with create, read, update, replace, delete and aggregation routes.

## Technologies

- **Node.js** 22.9 or newer (`--env-file-if-exists`, `import.meta.dirname`)
- **Express.js** 5
- **Mongoose** 9 (ODM over the MongoDB driver 7)
- **MongoDB Atlas** (any MongoDB 6+ server works)
- **Passport** (local strategy), **express-session** with **connect-mongo** as the session store
- **Pug** and **EJS** views, **helmet**, **bcryptjs**

## Installation and startup

```bash
git clone https://github.com/Bleachigo/node-express-mongoose-70.git
cd node-express-mongoose-70
npm ci
cp .env.example .env   # then fill in your own values
npm start              # or: npm run dev (restarts on file changes)
```

On startup `server.js` connects to MongoDB through Mongoose, then builds the Express app (`createApp()`) and starts listening on `PORT`. `Ctrl+C` (or `SIGTERM`) stops the HTTP server and closes the Mongoose connection.

### Environment variables

| Variable          | Required | Description                                                              |
| ----------------- | -------- | ------------------------------------------------------------------------ |
| `PORT`            | No       | Port the server listens on (`3000` in `.env.example`).                   |
| `SESSION_SECRET`  | Yes      | Secret used to sign the session cookie.                                  |
| `NODE_ENV`        | No       | `development` (default in `.env.example`) or `production`.               |
| `MONGODB_URI`     | Yes      | MongoDB connection string (`mongodb+srv://…` for Atlas).                 |
| `MONGODB_DB_NAME` | Yes      | Database name. Holds the `users`, `balloons` and `sessions` collections. |

See `.env.example` for the expected format.

## Project structure

```text
src/
├── config/
│   ├── mongodb.config.js        # mongoose.connect / mongoose.disconnect
│   └── passport.config.js       # Local strategy, serializeUser / deserializeUser
├── models/
│   ├── user.model.js            # User schema and model
│   └── balloon.model.js         # Balloon schema and model, field lists
├── routes/                      # URL → middleware → controller
├── controllers/                 # Read the request, call a service, send the response
├── services/                    # Business rules, 404 checks, query filters
├── repositories/
│   ├── users.repository.js      # User model queries
│   └── balloons.repository.js   # Balloon model queries, aggregation pipeline
├── middleware/                  # Auth, roles, logging, theme, errors
├── scripts/
│   └── seed-prices.js           # One-off script: gives every balloon a random `price`
└── views/                       # Pug (users, root) and EJS (articles) templates
```

Requests flow routes → controllers → services → repositories → Mongoose models → MongoDB.

## Mongoose setup

### Connection

`src/config/mongodb.config.js`:

```js
await mongoose.connect(process.env.MONGODB_URI, {
  dbName: process.env.MONGODB_DB_NAME,
});
```

`server.js` awaits `connectMongo()` before it calls `createApp()`. The session store reuses the same connection pool instead of opening a second client:

```js
// app.js
MongoStore.create({
  client: mongoose.connection.getClient(),
  dbName: process.env.MONGODB_DB_NAME,
  collectionName: 'sessions',
});
```

That is why the app is built in a function: `getClient()` only returns a connected client after `mongoose.connect` has finished.

### From the driver to Mongoose

| Before (driver)                                    | Now (Mongoose)                                                     |
| -------------------------------------------------- | ------------------------------------------------------------------ |
| `MongoClient` + `client.db(name).collection(name)` | `mongoose.connect(uri, { dbName })`, models own their collections  |
| Hand-written checks in services                    | Schema validation (`required`, `enum`, `min`/`max`, custom)        |
| `projection` on every read to hide `passwordHash`  | `select: false` on the field, `toJSON` transform                   |
| `ObjectId.isValid` + `new ObjectId(id)`            | Mongoose casts string ids; an invalid one is a `CastError` → `400` |
| `_id` → `id` mapper functions                      | `toJSON: { virtuals: true }` adds `id`, the transform drops `_id`  |
| `createdAt` set in the service                     | `timestamps: true` (`createdAt` and `updatedAt`)                   |
| Check-then-insert for unique emails                | Unique index on `email`; duplicate key (E11000) → `409`            |

## Mongoose models

Both schemas use `timestamps: true` and the same `toJSON` options: `virtuals: true` (adds `id` as a string), `versionKey: false` (no `__v` in responses) and a transform that deletes `_id`. Because `res.json()` calls `toJSON()`, every API response has `id` instead of `_id`.

### `User` — collection `users` (`src/models/user.model.js`)

| Field          | Type     | Validation and options                                    |
| -------------- | -------- | --------------------------------------------------------- |
| `email`        | `String` | `required`, `trim`, `lowercase`, `unique`                 |
| `passwordHash` | `String` | `required`, `select: false` (not loaded unless asked for) |
| `role`         | `String` | `required`, `enum: ['user', 'admin']`, `default: 'user'`  |
| `createdAt`    | `Date`   | Set by `timestamps`                                       |
| `updatedAt`    | `Date`   | Set by `timestamps`, changes on every update              |

Indexes:

| Index          | Why                                                                                                                                                   |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `{ _id: 1 }`   | Default. Used by `findById` (session lookups on every logged-in request).                                                                             |
| `{ email: 1 }` | **Unique**, from `unique: true`. Login lookups, and it rejects a second account with the same email even when two registrations run at the same time. |

Notes:

- `trim` and `lowercase` also apply to queries, so `findOne({ email: 'A@Mail.com ' })` finds `a@mail.com`. Login works in any letter case.
- `passwordHash` is read only by `usersRepository.findCredentialsByEmail` (`.select('+passwordHash')`), which login uses. The `toJSON` transform deletes it too, as a second guard.
- `role` defaults to `user`; there is no route that creates an admin (see [Testing](#testing-with-postman)).

### `Balloon` — collection `balloons` (`src/models/balloon.model.js`)

| Field       | Type     | Validation and options                                                         |
| ----------- | -------- | ------------------------------------------------------------------------------ |
| `color`     | `String` | `required`, `enum: ['red', 'green', 'blue']`                                   |
| `shape`     | `String` | `required`, `enum: ['round', 'heart', 'star']`                                 |
| `size`      | `Number` | `required`, `min: 20`, `max: 100`, custom validator: must be an integer        |
| `price`     | `Number` | Optional, `min: 0`. Set by the client or by the [seed script](#seeding-prices) |
| `createdAt` | `Date`   | Set by `timestamps`                                                            |
| `updatedAt` | `Date`   | Set by `timestamps`                                                            |

Indexes: only the default `{ _id: 1 }`.

The model file also exports field lists derived from the schema, so code that needs them follows the model when a field is added:

| Export             | Value                             | Used by                                     |
| ------------------ | --------------------------------- | ------------------------------------------- |
| `UPDATABLE_FIELDS` | `color`, `shape`, `size`, `price` | `balloonsRepository.replaceBalloon` (`PUT`) |
| `REQUIRED_FIELDS`  | `color`, `shape`, `size`          | —                                           |
| `OPTIONAL_FIELDS`  | `price`                           | —                                           |

Values are cast before validation: `"size": "30"` is stored as the number `30`. Fields that are not in the schema are dropped (Mongoose `strict` mode).

### Sessions — collection `sessions`

Managed by `connect-mongo`, not by a Mongoose model. Sessions expire after one hour (`ttl`), MongoDB removes them with a TTL index (`autoRemove: 'native'`), and an unchanged session is written at most once every 10 minutes (`touchAfter`).

## Database operations

Every query goes through a model. Updates use `runValidators: true`, so the schema rules apply to updates as well as to inserts.

| Operation       | Mongoose method                                    | Route                                      | Repository method                                   |
| --------------- | -------------------------------------------------- | ------------------------------------------ | --------------------------------------------------- |
| Create one      | `User.create`                                      | `POST /auth/register`                      | `usersRepository.createOne`                         |
| Create many     | `Balloon.create(array)`                            | `POST /balloons`                           | `balloonsRepository.createMany`                     |
| Read all        | `User.find`                                        | `GET /users`                               | `usersRepository.findAll`                           |
| Read one        | `User.findById`, `User.findOne`                    | `GET /users/:userId`, login, every session | `findById`, `findByEmail`, `findCredentialsByEmail` |
| Update one      | `User.findByIdAndUpdate`                           | `PATCH /users/:userId`                     | `usersRepository.update`                            |
|                 | `Balloon.findByIdAndUpdate`                        | `PATCH /balloons/:balloonId`               | `balloonsRepository.updateBalloon`                  |
| Replace one     | `User.findOneAndReplace`                           | `PUT /users/:userId`                       | `usersRepository.replace`                           |
|                 | `Balloon.findByIdAndUpdate` with `$set` + `$unset` | `PUT /balloons/:balloonId`                 | `balloonsRepository.replaceBalloon`                 |
| Update many     | `Balloon.updateMany`                               | `PATCH /balloons?color=…&shape=…`          | `balloonsRepository.updateBalloons`                 |
| Delete one      | `User.findByIdAndDelete`                           | `DELETE /users/:userId`                    | `usersRepository.delete`                            |
|                 | `Balloon.deleteOne`                                | `DELETE /balloons/:balloonId`              | `balloonsRepository.deleteBalloon`                  |
| Delete many     | `Balloon.deleteMany`                               | `DELETE /balloons?color=…&shape=…`         | `balloonsRepository.deleteBalloons`                 |
| Aggregate       | `Balloon.aggregate`                                | `GET /balloons/stats`                      | `balloonsRepository.getStats`                       |
| Pipeline update | `Balloon.updateMany` with `updatePipeline: true`   | — (`seed-prices.js`)                       | `balloonsRepository.randomizePrices`                |

`PUT /balloons/:balloonId` sets every field in the body and unsets every schema field that is missing, so it behaves as a replacement but keeps `_id` and `createdAt`. Missing required fields are rejected by the validators (`400`).

### Filters for many-document operations

`updateMany` and `deleteMany` on balloons build their filter from the `color` and `shape` query parameters. Both are required, the color is trimmed and lowercased, the shape must be one of `round`, `heart`, `star`, and an empty filter is rejected with `400`, so a request can never update or delete the whole collection.

### Aggregation: `GET /balloons/stats`

Price statistics for balloons, one object per shape, largest group first. Pipeline in `balloonsRepository.getStats`:

| Stage      | What it does                                                                                                                  |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `$match`   | Keeps only the balloons that pass the optional filters below. Skipped when no filter is given.                                |
| `$group`   | Groups by `shape`: `count` (`$sum: 1`), `totalPrice` (`$sum`), `avgPrice` (`$avg`), `minPrice` (`$min`), `maxPrice` (`$max`). |
| `$project` | Renames `_id` to `shape` and rounds `avgPrice` to 2 decimals (`$round`).                                                      |
| `$sort`    | Sorts by `count`, descending.                                                                                                 |

| Parameter  | Meaning                                    | Invalid value                          |
| ---------- | ------------------------------------------ | -------------------------------------- |
| `shape`    | Only balloons of this shape                | An unknown shape gives an empty array  |
| `minPrice` | Only balloons with `price` ≥ this number   | `400` `minPrice must be a number`      |
| `maxPrice` | Only balloons with `price` ≤ this number   | `400` `maxPrice must be a number`      |
| `days`     | Only balloons created in the last _n_ days | `400` `days must be a positive number` |

Balloons without a price are counted in `count` but add nothing to the sums (`minPrice`/`maxPrice`/`avgPrice` are `null` for a group where no balloon has a price).

### Seeding prices

```bash
node src/scripts/seed-prices.js   # run from the project root, so that .env is found
```

Gives every balloon without a `price` a random one from 10 to 200, rounded to 2 decimals, and prints `Updated {n} balloons`. Balloons that already have a price are left alone, so it is safe to run again.

## Routes

### Auth

| Method | Path             | Body                      | Response                                                                         |
| ------ | ---------------- | ------------------------- | -------------------------------------------------------------------------------- |
| POST   | `/auth/register` | `{ "email", "password" }` | `201` `{ "user": { "id", "email", "role", "createdAt", "updatedAt" } }`          |
| POST   | `/auth/login`    | `{ "email", "password" }` | `200` `{ "message": "Login successful", "user": { "id", "email" } }`, sets `sid` |
| GET    | `/auth/me`       | —                         | `200` `{ "user": { "id", "email", "role" } }` (login required)                   |
| POST   | `/auth/logout`   | —                         | `200` `{ "message": "Logout successful" }` (login required)                      |

### Users

All routes require a logged-in session. `PUT`, `PATCH` and `DELETE` additionally require the `admin` role. `:userId` is a MongoDB `ObjectId` string.

| Method | Path             | Auth  | Body                                 | Response                                                              |
| ------ | ---------------- | ----- | ------------------------------------ | --------------------------------------------------------------------- |
| GET    | `/users`         | user  | —                                    | HTML list of every user's email and id                                |
| GET    | `/users/:userId` | user  | —                                    | HTML page for one user                                                |
| PUT    | `/users/:userId` | admin | `{ "email", "password", "role" }`    | `200` the new user. The password is hashed; `role` defaults to `user` |
| PATCH  | `/users/:userId` | admin | Fields to change, e.g. `{ "email" }` | `200` the updated user                                                |
| DELETE | `/users/:userId` | admin | —                                    | `200` the deleted user                                                |

### Balloons

No login needed. `:balloonId` is a MongoDB `ObjectId` string. The fields and their rules are in [the model](#balloon--collection-balloons-srcmodelsballoonmodeljs).

| Method | Path                            | Body                                                  | Response                                                          |
| ------ | ------------------------------- | ----------------------------------------------------- | ----------------------------------------------------------------- |
| GET    | `/balloons/stats`               | —                                                     | `200` array of price statistics per shape                         |
| POST   | `/balloons`                     | One balloon or an array of balloons                   | `201` the created balloon(s), with `id`, `createdAt`, `updatedAt` |
| PATCH  | `/balloons/:balloonId`          | Fields to change, e.g. `{ "size": 45 }`               | `200` the updated balloon                                         |
| PUT    | `/balloons/:balloonId`          | Full balloon `{ "color", "shape", "size", "price"? }` | `200` the replaced balloon                                        |
| DELETE | `/balloons/:balloonId`          | —                                                     | `200` `{ "message": "1 balloon {id} successfully deleted" }`      |
| PATCH  | `/balloons?color={c}&shape={s}` | `{ "color": "<new color>" }`                          | `200` `{ "matched", "modified" }`                                 |
| DELETE | `/balloons?color={c}&shape={s}` | —                                                     | `200` `{ "message": "{n} document/s deleted" }`                   |

### Other

| Method | Path        | Response                                                          |
| ------ | ----------- | ----------------------------------------------------------------- |
| GET    | `/`         | Pug home page                                                     |
| POST   | `/theme`    | `{ "theme": "light" \| "dark" }` → `200`, sets the `theme` cookie |
| GET    | `/articles` | HTML list from JSONPlaceholder (login required)                   |

### Errors

Errors are answered as plain text. Mongoose errors are translated in `src/middleware/error.middleware.js`:

| Status | Condition                                                     | Response                                                                                      |
| ------ | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| 400    | Malformed JSON body                                           | `Invalid JSON in request body`                                                                |
| 400    | Invalid id (`CastError`)                                      | `Invalid value for _id. Expected ObjectId`                                                    |
| 400    | Schema validation failed (`ValidationError`)                  | Every message joined with `; `, e.g. `` `pink` is not a valid enum value for path `color`. `` |
| 400    | Missing `color`/`shape` query parameter on `/balloons`        | `Query param "color" is required`, `shape must be one of …`                                   |
| 400    | Empty `PATCH /balloons/:balloonId`                            | `No fields to update`                                                                         |
| 400    | Invalid `minPrice`, `maxPrice` or `days` on `/balloons/stats` | `minPrice must be a number`, `days must be a positive number`                                 |
| 401    | No session, or wrong email/password at login                  | `Unauthorized` / `Invalid email or password` / `Missing credentials`                          |
| 403    | The account lacks the `admin` role                            | `Access denied`                                                                               |
| 404    | No user or balloon with that id                               | `User {id} not found` / `Balloon {id} not found`                                              |
| 404    | No balloons match the `color`/`shape` filter                  | `No matches were found by your query {…}`                                                     |
| 409    | Registering an email that already exists                      | `User already exists`                                                                         |
| 409    | Changing an email to one that is taken (unique index)         | `This email already exists`                                                                   |
| 500    | Unexpected server error                                       | `Internal server error`                                                                       |

## Testing with Postman

### Before you start

1. Create an environment with `baseUrl` = `http://localhost:3000`.
2. For JSON bodies choose **Body → raw → JSON**.
3. Postman keeps cookies per domain, so after **Login** the `sid` cookie is sent with every later request.
4. `:userId` and `:balloonId` are 24-hex ids. Copy them from earlier responses (`id`).
5. The admin-only routes need an account with `role: "admin"`. Register it, change `role` to `"admin"` in the `users` collection (Atlas Data Explorer, Compass or `mongosh`), then log in again.

Run the blocks in order: each uses data created by the one before it.

### 1. Auth

| #   | Request               | Method | URL                         | Body (raw JSON)                                                | Expected                                                    |
| --- | --------------------- | ------ | --------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------- |
| 1   | Register              | POST   | `{{baseUrl}}/auth/register` | `{ "email": "Student@Mail.com", "password": "test-password" }` | `201`, `email` stored as `student@mail.com`, `role: "user"` |
| 2   | Register again        | POST   | `{{baseUrl}}/auth/register` | same as #1                                                     | `409` `User already exists`                                 |
| 3   | Login, other case     | POST   | `{{baseUrl}}/auth/login`    | `{ "email": "STUDENT@MAIL.COM", "password": "test-password" }` | `200`, sets the `sid` cookie                                |
| 4   | Login, wrong password | POST   | `{{baseUrl}}/auth/login`    | `{ "email": "student@mail.com", "password": "wrong" }`         | `401` `Invalid email or password`                           |
| 5   | Who am I              | GET    | `{{baseUrl}}/auth/me`       | —                                                              | `200` `{ "user": { "id", "email", "role" } }`               |

### 2. Users (any logged-in user)

| #   | Request    | Method | URL                                          | Expected                                         |
| --- | ---------- | ------ | -------------------------------------------- | ------------------------------------------------ |
| 1   | All users  | GET    | `{{baseUrl}}/users`                          | `200` HTML list; no password hashes              |
| 2   | One user   | GET    | `{{baseUrl}}/users/:userId`                  | `200` HTML page                                  |
| 3   | Unknown id | GET    | `{{baseUrl}}/users/000000000000000000000000` | `404` `User 000000000000000000000000 not found`  |
| 4   | Invalid id | GET    | `{{baseUrl}}/users/abc`                      | `400` `Invalid value for _id. Expected ObjectId` |

### 3. Users (admin)

Use the id of a test user, not your admin account.

| #   | Request        | Method | URL                         | Body (raw JSON)                                                               | Expected                                                            |
| --- | -------------- | ------ | --------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| 1   | Update email   | PATCH  | `{{baseUrl}}/users/:userId` | `{ "email": "Student2@Mail.com" }`                                            | `200`, `email: "student2@mail.com"`                                 |
| 2   | Invalid role   | PATCH  | `{{baseUrl}}/users/:userId` | `{ "role": "superadmin" }`                                                    | `400` `` `superadmin` is not a valid enum value for path `role`. `` |
| 3   | Taken email    | PATCH  | `{{baseUrl}}/users/:userId` | `{ "email": "<your admin email>" }`                                           | `409` `This email already exists`                                   |
| 4   | Replace user   | PUT    | `{{baseUrl}}/users/:userId` | `{ "email": "student@mail.com", "password": "new-password", "role": "user" }` | `200` the new user; the password is stored as a hash                |
| 5   | Delete user    | DELETE | `{{baseUrl}}/users/:userId` | —                                                                             | `200` the deleted user                                              |
| 6   | Delete again   | DELETE | `{{baseUrl}}/users/:userId` | —                                                                             | `404`                                                               |
| 7   | As a non-admin | PATCH  | `{{baseUrl}}/users/:userId` | `{ "email": "x@mail.com" }`                                                   | `403` `Access denied`                                               |

### 4. Balloons: create

| #   | Request         | Method | URL                    | Body (raw JSON)                                                                                                                                           | Expected                                                      |
| --- | --------------- | ------ | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| 1   | Create balloons | POST   | `{{baseUrl}}/balloons` | `[{ "color": "red", "shape": "heart", "size": 30 }, { "color": "red", "shape": "heart", "size": 40 }, { "color": "blue", "shape": "round", "size": 50 }]` | `201` array of 3 balloons with `id`, `createdAt`, `updatedAt` |
| 2   | Create one      | POST   | `{{baseUrl}}/balloons` | `{ "color": "green", "shape": "star", "size": 25, "price": 5 }`                                                                                           | `201` one balloon                                             |
| 3   | Invalid values  | POST   | `{{baseUrl}}/balloons` | `[{ "color": "pink", "shape": "cube", "size": 1 }]`                                                                                                       | `400` with the three validation messages                      |
| 4   | Not an integer  | POST   | `{{baseUrl}}/balloons` | `[{ "color": "red", "shape": "heart", "size": 30.5 }]`                                                                                                    | `400` `You have entered 30.5. Must be an integer (20-100)`    |

Copy the `id` of the blue balloon for block 6.

### 5. Balloon statistics

Run `node src/scripts/seed-prices.js` first, so that the new balloons have a `price`.

| #   | Request         | Method | URL                                                   | Expected                                          |
| --- | --------------- | ------ | ----------------------------------------------------- | ------------------------------------------------- |
| 1   | All statistics  | GET    | `{{baseUrl}}/balloons/stats`                          | `200` one object per shape, largest `count` first |
| 2   | One shape       | GET    | `{{baseUrl}}/balloons/stats?shape=heart`              | `200` one object, `"shape": "heart"`              |
| 3   | Price range     | GET    | `{{baseUrl}}/balloons/stats?minPrice=50&maxPrice=150` | `200` only balloons priced 50–150 are counted     |
| 4   | Recent balloons | GET    | `{{baseUrl}}/balloons/stats?days=1`                   | `200` only balloons created in the last 24 hours  |
| 5   | Invalid price   | GET    | `{{baseUrl}}/balloons/stats?minPrice=cheap`           | `400` `minPrice must be a number`                 |

### 6. Balloons by id

| #   | Request        | Method | URL                               | Body (raw JSON)                                     | Expected                                                           |
| --- | -------------- | ------ | --------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------ |
| 1   | Update a field | PATCH  | `{{baseUrl}}/balloons/:balloonId` | `{ "size": 45 }`                                    | `200` the balloon with `size: 45` and a new `updatedAt`            |
| 2   | Out of range   | PATCH  | `{{baseUrl}}/balloons/:balloonId` | `{ "size": 5 }`                                     | `400` ``Path `size` (5) is less than minimum allowed value (20).`` |
| 3   | Replace        | PUT    | `{{baseUrl}}/balloons/:balloonId` | `{ "color": "green", "shape": "star", "size": 33 }` | `200`; `price` is removed, `createdAt` is kept                     |
| 4   | Incomplete PUT | PUT    | `{{baseUrl}}/balloons/:balloonId` | `{ "color": "green" }`                              | `400` `Shape is required; Size is required`                        |
| 5   | Delete         | DELETE | `{{baseUrl}}/balloons/:balloonId` | —                                                   | `200` `{ "message": "1 balloon <id> successfully deleted" }`       |
| 6   | Delete again   | DELETE | `{{baseUrl}}/balloons/:balloonId` | —                                                   | `404` `Balloon with <id> not found`                                |
| 7   | Invalid id     | DELETE | `{{baseUrl}}/balloons/xyz`        | —                                                   | `400` `Invalid value for _id. Expected ObjectId`                   |

### 7. Balloons by filter

Uses the two red hearts from block 4.

| #   | Request         | Method | URL                                            | Body (raw JSON)        | Expected                                                       |
| --- | --------------- | ------ | ---------------------------------------------- | ---------------------- | -------------------------------------------------------------- |
| 1   | Recolor many    | PATCH  | `{{baseUrl}}/balloons?color=red&shape=heart`   | `{ "color": "green" }` | `200` `{ "matched": 2, "modified": 2 }`                        |
| 2   | Invalid color   | PATCH  | `{{baseUrl}}/balloons?color=green&shape=heart` | `{ "color": "pink" }`  | `400` `` `pink` is not a valid enum value for path `color`. `` |
| 3   | Nothing matches | PATCH  | `{{baseUrl}}/balloons?color=red&shape=heart`   | `{ "color": "green" }` | `404` — the red hearts are green now                           |
| 4   | Missing filter  | PATCH  | `{{baseUrl}}/balloons?color=green`             | `{ "color": "red" }`   | `400` `Query param "shape" is required`                        |
| 5   | Delete many     | DELETE | `{{baseUrl}}/balloons?color=green&shape=heart` | —                      | `200` `{ "message": "2 document/s deleted" }`                  |
| 6   | No filter       | DELETE | `{{baseUrl}}/balloons`                         | —                      | `400` `Query param "color" is required`; nothing is deleted    |

### 8. Logout

| #   | Request | Method | URL                       | Expected                                                                        |
| --- | ------- | ------ | ------------------------- | ------------------------------------------------------------------------------- |
| 1   | Logout  | POST   | `{{baseUrl}}/auth/logout` | `200` `{ "message": "Logout successful" }`; `/auth/me` answers `401` afterwards |
