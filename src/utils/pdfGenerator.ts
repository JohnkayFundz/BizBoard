export interface ProposalPdfData {
  company: string
  contact?: string | null
  service: string
  timeline: string
  investment: number
  taxRate: number
  tax: number
  total: number
  opportunities: string[]
  findings: string[]
  deliverables: string[]
}

function money(value:number){return new Intl.NumberFormat('en-NG',{style:'currency',currency:'NGN',maximumFractionDigits:0}).format(Number(value||0))}
function safe(value:string){return value.replace(/[&<>]/g,'').trim()}

export async function downloadProposalPdf(data:ProposalPdfData):Promise<void>{
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({unit:'mm',format:'a4'})
  const pageWidth=210, margin=18, contentWidth=pageWidth-margin*2
  let y=20
  const line=(text:string,size=10,bold=false)=>{
    doc.setFont('helvetica',bold?'bold':'normal');doc.setFontSize(size)
    const lines=doc.splitTextToSize(safe(text),contentWidth)
    doc.text(lines,margin,y);y+=lines.length*(size*0.48)+4
    if(y>275){doc.addPage();y=20}
  }
  doc.setFillColor(15,23,42);doc.rect(0,0,pageWidth,35,'F')
  doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.setFontSize(18);doc.text('JohnKay Fundz',margin,16)
  doc.setFont('helvetica','normal');doc.setFontSize(9);doc.text('WEBSITE PROJECT PROPOSAL',margin,24)
  doc.text(new Date().toLocaleDateString('en-NG'),pageWidth-margin,24,{align:'right'})
  doc.setTextColor(15,23,42);y=48
  line('Prepared for: '+data.company,12,true);line('Contact: '+(data.contact||'Not provided'));line('Prepared by: John Kalumba — JohnKay Fundz')
  y+=3;line('PROJECT SCOPE',13,true);line('Recommended solution: '+data.service);line('Timeline: '+data.timeline)
  if(data.opportunities.length){line('KEY OPPORTUNITIES',12,true);data.opportunities.slice(0,8).forEach(x=>line('• '+x))}
  if(data.findings.length){line('ANALYSIS FINDINGS',12,true);data.findings.slice(0,8).forEach(x=>line('• '+x))}
  line('DELIVERABLES',12,true);data.deliverables.forEach(x=>line('• '+x))
  line('FINANCIAL SUMMARY',12,true)
  line('Investment: '+money(data.investment));line('Tax ('+data.taxRate+'%): '+money(data.tax));line('TOTAL CLIENT INVESTMENT: '+money(data.total),12,true)
  line('MILESTONE PAYMENTS',12,true);line('50% · Project start · '+money(data.investment*.5));line('50% · Final delivery · '+money(data.investment*.5))
  line('NEXT STEPS',12,true);['Confirm the scope and required content.','Provide business information, images and other assets.','Approve the project start and payment arrangement.','Development, review and final delivery.'].forEach((x,i)=>line((i+1)+'. '+x))
  line('Thank you for considering JohnKay Fundz.');line('John Kalumba — JohnKay Fundz',10,true)
  const filename=(data.company||'johnkay-proposal').replace(/[^a-z0-9]+/gi,'-').toLowerCase()+'-proposal.pdf'
  doc.save(filename)
}
