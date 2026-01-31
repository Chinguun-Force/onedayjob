export const typeDefs = `#graphql
  scalar JSON

  enum Role {
    ADMIN
    EMPLOYEE
  }

  enum NotificationType {
    PROFILE_UPDATED
    NEW_EMPLOYEE_ADDED
    ANNOUNCEMENT
    PASSWORD_CHANGE
    ROLE_CHANGE
  }

  enum Channel {
    IN_APP
  }

  enum RecipientStatus {
    UNREAD
    READ
  }

  type User {
    id: ID!
    email: String!
    name: String
    role: Role!
    mustChangePassword: Boolean!
    passwordChangedAt: String
    createdAt: String!
    updatedAt: String!
  }

  type AdminUser {
    id: ID!
    email: String!
    name: String
    role: Role!
    mustChangePassword: Boolean!
    createdAt: String!
  }

  type NotificationTemplate {
    id: ID!
    type: NotificationType!
    title: String!
    body: String!
    createdAt: String!
    updatedAt: String!
  }

  type Notification {
    id: ID!
    type: NotificationType!
    channel: Channel!
    payloadJson: JSON
    createdAt: String!
  }

  type NotificationRecipient {
    id: ID!
    status: RecipientStatus!
    deliveredAt: String
    readAt: String
    createdAt: String!
    notification: Notification!
  }

  input UpsertTemplateInput {
    type: NotificationType!
    title: String!
    body: String!
  }

  input SendNotificationInput {
    type: NotificationType!
    targetRole: Role!
    payload: JSON
  }

  input CreateUserInput {
    email: String!
    role: Role!
  }

  input AddUserInput {
    email: String!
    name: String
    role: Role!
  }

  type Query {
    me: User
    adminUsers: [AdminUser!]!
    users: [User!]!
    templates: [NotificationTemplate!]!
    template(type: NotificationType!): NotificationTemplate
    myNotifications: [NotificationRecipient!]!
    canSignupAdmin: Boolean!
  }

  type Mutation {
    upsertTemplate(input: UpsertTemplateInput!): NotificationTemplate!
    deleteTemplate(type: NotificationType!): Boolean!
    createUser(input: CreateUserInput!): AdminUser!
    addUser(input: AddUserInput!): Boolean!
    resetUserPassword(userId: ID!): Boolean!
    forceResetPassword(userId: ID!): Boolean!
    sendNotification(input: SendNotificationInput!): Boolean!
    markRead(recipientId: ID!): Boolean!
    markAllRead: Int!
    changeMyPassword(oldPassword: String!, newPassword: String!): Boolean!
    bootstrapAdminSignup(email: String!, password: String!): Boolean!
  }
`;