export type ModerationStatus = 'pending' | 'approved' | 'rejected' | 'private';

interface ModerationStatusBadgeProps {
  status: ModerationStatus;
  visibility: string; // 'public' | 'private' | 'unlisted'
  showHelper?: boolean;
}

export function ModerationStatusBadge({ status, visibility, showHelper = false }: ModerationStatusBadgeProps) {
  let label = '';
  let helper = '';
  let colorVar = '';
  let bgColorVar = '';

  // Determine logical state. If a Voice hasn't been submitted yet, it's inherently private and not pending.
  const logicalStatus = (status === 'pending' && visibility === 'private') 
    ? 'pending'
    : (visibility === 'private' && status !== 'rejected') 
       ? 'private' 
       : status;

  switch (logicalStatus) {
    case 'pending':
      label = 'Pending review';
      helper = 'Your voice has been submitted and is waiting for Trust & Safety review.';
      colorVar = 'var(--color-warning)';
      bgColorVar = 'rgba(245, 158, 11, 0.1)';
      break;
    case 'approved':
      label = 'Live';
      helper = 'Your voice is live in the marketplace.';
      colorVar = 'var(--color-success)';
      bgColorVar = 'rgba(16, 185, 129, 0.1)';
      break;
    case 'rejected':
      label = 'Rejected';
      helper = 'This voice needs changes before it can go live.';
      colorVar = 'var(--color-error)';
      bgColorVar = 'rgba(239, 68, 68, 0.1)';
      break;
    case 'private':
    default:
      label = 'Not submitted';
      helper = 'This voice is private and has not been submitted for marketplace review.';
      colorVar = 'var(--text-secondary)';
      bgColorVar = 'rgba(255, 255, 255, 0.05)';
      break;
  }

  // Override mapping: if a voice is approved but explicitly toggled back to private visibility by the creator
  if (status === 'approved' && visibility === 'private') {
    label = 'Private (Live Off)';
    helper = 'Voice is approved but explicitly hidden from marketplace.';
    colorVar = 'var(--text-secondary)';
    bgColorVar = 'rgba(255, 255, 255, 0.05)';
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ 
        display: 'inline-flex', 
        alignItems: 'center', 
        gap: '6px', 
        padding: '6px 12px', 
        borderRadius: '50px', 
        background: bgColorVar, 
        color: colorVar, 
        fontSize: '0.8rem', 
        fontWeight: 600,
        border: `1px solid ${colorVar.replace('var(', '').replace(')', '')}`, // subtle border hint
        width: 'fit-content'
      }}>
        <div style={{ 
           width: '6px', 
           height: '6px', 
           borderRadius: '50%', 
           background: colorVar,
           boxShadow: `0 0 6px ${colorVar}`
        }} />
        {label}
      </div>
      
      {showHelper && (
        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
          {helper}
        </div>
      )}
    </div>
  );
}
