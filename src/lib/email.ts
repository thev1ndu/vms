import { Resend } from 'resend';
import { render } from '@react-email/render';
import ApprovalEmail from './email-templates/ApprovalEmail';
import TaskApplicationEmail from './email-templates/TaskApplicationEmail';
import TaskAcceptanceEmail from './email-templates/TaskAcceptanceEmail';

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
  creatorName?: string;
  creatorEmail?: string;
}

export async function sendApprovalEmail({
  email,
  name,
  volunteerId,
}: ApprovalEmailData) {
  try {
    const emailHtml = await render(
      ApprovalEmail({
        name,
        volunteerId,
      })
    );

    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'VMS <noreply@yourdomain.com>',
      to: [email],
      subject: 'Welcome to Patrons at Yogeshwari',
      html: emailHtml,
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
    const emailHtml = await render(
      TaskApplicationEmail({
        creatorName,
        applicantName,
        applicantVolunteerId,
        taskTitle,
        taskDescription,
        taskMode,
        taskCategory,
        taskXpReward,
      })
    );

    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'VMS <noreply@yourdomain.com>',
      to: [creatorEmail],
      subject: `New Applicant for ${taskTitle}`,
      html: emailHtml,
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
  creatorName,
  creatorEmail,
}: TaskAcceptanceNotificationEmailData) {
  try {
    const emailHtml = await render(
      TaskAcceptanceEmail({
        userName,
        userVolunteerId,
        taskTitle,
        taskDescription,
        taskMode,
        taskCategory,
        taskXpReward,
        assignedCount,
        requiredCount,
        creatorName,
        creatorEmail,
      })
    );

    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'VMS <noreply@yourdomain.com>',
      to: [userEmail],
      subject: `Congratulations! You've been accepted for ${taskTitle}`,
      html: emailHtml,
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
