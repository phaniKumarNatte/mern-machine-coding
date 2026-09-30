Role Model
Create models/Role.js:

import mongoose from "mongoose";

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      enum: ["admin", "manager", "user"],
    },
  },
  {
    timestamps: true,
  }
);

export const Role = mongoose.model("Role", roleSchema);

Your database might contain:

Role
--------------------------------
_id                  name
65abc123             admin
65abc456             manager
65abc789             user

2. User Model
Create models/User.js:

import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
    },

    password: {
      type: String,
      required: true,
    },

    roles: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Role",
      },
    ],
  },
  {
    timestamps: true,
  }
);

export const User = mongoose.model("User", userSchema);

Now a user can have multiple roles:

User
------------------------------------------------
_id        name       email        roles
123        John       ...          [adminId, managerId]

3. Creating Roles
For example:

const adminRole = await Role.create({
  name: "admin",
});

const userRole = await Role.create({
  name: "user",
});

4. Creating a User with Roles
You can find the role first:

const adminRole = await Role.findOne({
  name: "admin",
});

Then create the user:

const user = await User.create({
  name: "John",
  email: "john@example.com",
  password: "hashedPassword",
  roles: [adminRole._id],
});

The User document will look something like:

{
  _id: "123",
  name: "John",
  email: "john@example.com",
  roles: ["65abc123"]
}

The important thing is that "65abc123" is the Role document's ID, not the string "admin".

5. Getting User with Role Details
By default, you'll get only the role IDs:

const user = await User.findById(userId);

Result:

{
  name: "John",
  roles: [
    "65abc123",
    "65abc789"
  ]
}

If you want the actual role information, use Mongoose populate():

const user = await User.findById(userId)
  .populate("roles");

Now you'll get:

{
  name: "John",
  email: "john@example.com",

  roles: [
    {
      _id: "65abc123",
      name: "admin"
    },
    {
      _id: "65abc789",
      name: "user"
    }
  ]
}

6. Checking User Role
For example, you might want to check whether the user is an admin:

const isAdmin = user.roles.some(
  role => role.name === "admin"
);

if (isAdmin) {
  console.log("User is an admin");
}

Or create middleware:

const requireRole = (requiredRole) => {
  return (req, res, next) => {
    const hasRole = req.user.roles.some(
      role => role.name === requiredRole
    );

    if (!hasRole) {
      return res.status(403).json({
        message: "Access denied",
      });
    }

    next();
  };
};

Then:

router.delete(
  "/users/:id",
  requireRole("admin"),
  deleteUser
);

Why use a separate Role collection?
Instead of doing this:

roles: ["admin", "user"]

you use:

roles: [
  ObjectId("65abc123"),
  ObjectId("65abc789")
]

because the role information can be managed separately.

For example:

User
  |
  | roles[]
  ↓
Role Collection
  |
  ├── admin
  ├── manager
  ├── editor
  └── user

This is particularly useful when your application grows and you need role metadata, permissions, role management, or dynamic roles.

Interview answer
You can say:

"In a MongoDB application, I prefer keeping roles in a separate collection when the authorization model is expected to grow. The User schema stores an array of ObjectId references to the Role collection. Using Mongoose's ref and populate(), I can retrieve the user's role details. This avoids scattering hardcoded role values