export const typeDefs = `#graphql
  scalar JSON

  enum Role {
    ADMIN
    EMPLOYEE
  }

  enum NotificationType {
    PROFILE_UPDATED
    NEW_EMPLOYEE_ADDED
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

  type Query {
    me: User
    users: [User!]!

    templates: [NotificationTemplate!]!
    template(type: NotificationType!): NotificationTemplate

    myNotifications: [NotificationRecipient!]!
  }

  type Mutation {
    upsertTemplate(input: UpsertTemplateInput!): NotificationTemplate!
    deleteTemplate(type: NotificationType!): Boolean!

    sendNotification(input: SendNotificationInput!): Boolean!
    markRead(recipientId: ID!): Boolean!
    markAllRead: Int!
  }
`;
