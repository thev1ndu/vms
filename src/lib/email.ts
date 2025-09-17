import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export interface ApprovalEmailData {
  email: string;
  name?: string;
  volunteerId?: string;
}

export interface TaskApplicationEmailData {
  creatorEmail: string;
  creatorName?: string;
  applicantEmail: string;
  applicantName?: string;
  applicantVolunteerId?: string;
  taskTitle: string;
  taskDescription: string;
  taskMode: string;
  taskCategory: string;
  taskXpReward: number;
}

export interface TaskAcceptanceNotificationEmailData {
  userEmail: string;
  userName?: string;
  userVolunteerId?: string;
  taskTitle: string;
  taskDescription: string;
  taskMode: string;
  taskCategory: string;
  taskXpReward: number;
  assignedCount: number;
  requiredCount: number;
}

export async function sendApprovalEmail({
  email,
  name,
  volunteerId,
}: ApprovalEmailData) {
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'VMS <noreply@yourdomain.com>',
      to: [email],
      subject: 'Welcome to VMS - Your Account Has Been Approved! 🎉',
      html: `
        <h2>Welcome to VMS!</h2>
        <p>Hello ${name || 'there'},</p>
        
        <p>Great news! Your account has been approved and you're now officially part of the VMS (Volunteer Management System) community.</p>
        
        ${
          volunteerId
            ? `
        <p><strong>Your Volunteer ID:</strong> ${volunteerId}</p>
        <p>Keep this ID handy - you'll need it for various activities and check-ins.</p>
        `
            : ''
        }
        
        <p>You can now access all the features of the platform:</p>
        <ul>
          <li>Browse and apply for volunteer tasks</li>
          <li>Track your volunteer hours and achievements</li>
          <li>Connect with other volunteers</li>
          <li>Earn XP and level up your volunteer profile</li>
          <li>Participate in community discussions</li>
        </ul>
        
        <p><a href="${
          process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        }/dashboard">Get Started</a></p>
        
        <p>If you have any questions or need assistance, don't hesitate to reach out to our support team.</p>
        
        <p>Welcome aboard and thank you for joining our volunteer community!</p>
        
        <p>Best regards,<br>The VMS Team</p>
      `,
    });

    if (error) {
      console.error('Failed to send approval email:', error);
      return { success: false, error };
    }

    console.log('Approval email sent successfully:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Error sending approval email:', error);
    return { success: false, error };
  }
}

export async function sendTaskApplicationEmail({
  creatorEmail,
  creatorName,
  applicantEmail,
  applicantName,
  applicantVolunteerId,
  taskTitle,
  taskDescription,
  taskMode,
  taskCategory,
  taskXpReward,
}: TaskApplicationEmailData) {
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'VMS <noreply@yourdomain.com>',
      to: [creatorEmail],
      subject: `New Application for Task: ${taskTitle}`,
      text: `
Hello ${creatorName || 'Task Creator'},

A volunteer has applied for your task "${taskTitle}".

APPLICANT INFORMATION:
- Name: ${applicantName || 'Not provided'}
- Email: ${applicantEmail}
- Volunteer ID: ${applicantVolunteerId || 'Not assigned'}

TASK INFORMATION:
- Title: ${taskTitle}
- Description: ${taskDescription}
- Mode: ${taskMode}
- Category: ${taskCategory}
- XP Reward: ${taskXpReward}

You can manage this application and view all applicants in the admin panel.

Best regards,
The VMS Team
      `,
    });

    if (error) {
      console.error('Failed to send task application email:', error);
      return { success: false, error };
    }

    console.log('Task application email sent successfully:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Error sending task application email:', error);
    return { success: false, error };
  }
}

export async function sendTaskAcceptanceNotificationEmail({
  userEmail,
  userName,
  userVolunteerId,
  taskTitle,
  taskDescription,
  taskMode,
  taskCategory,
  taskXpReward,
  assignedCount,
  requiredCount,
}: TaskAcceptanceNotificationEmailData) {
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'VMS <noreply@yourdomain.com>',
      to: [userEmail],
      subject: `Congratulations! You've been accepted for: ${taskTitle}`,
      text: `
Hello ${userName || 'Volunteer'},

Great news! You have been accepted for the volunteer task "${taskTitle}".

TASK INFORMATION:
- Title: ${taskTitle}
- Description: ${taskDescription}
- Mode: ${taskMode}
- Category: ${taskCategory}
- XP Reward: ${taskXpReward}

CURRENT STATUS:
- Assigned Volunteers: ${assignedCount}/${requiredCount}
- Status: ${assignedCount >= requiredCount ? 'FULL' : 'OPEN'}

WHAT'S NEXT:
- You can now start working on this task
- Make sure to complete it within the specified timeframe
- You will earn ${taskXpReward} XP upon completion
- Contact the task creator if you have any questions

Thank you for your commitment to volunteering!

Best regards,
The VMS Team
      `,
    });

    if (error) {
      console.error(
        'Failed to send task acceptance notification email:',
        error
      );
      return { success: false, error };
    }

    console.log('Task acceptance notification email sent successfully:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Error sending task acceptance notification email:', error);
    return { success: false, error };
  }
}
