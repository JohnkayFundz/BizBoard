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
  doc.setProperties({title:'JohnKay Client Engine — Project Proposal',author:'John Kalumba — JohnKay Fundz',subject:'Client project proposal'})
  const pageWidth=210, pageHeight=297, margin=20, contentWidth=pageWidth-margin*2
  const bottom=pageHeight-margin
  let y=20

  const page=()=>{doc.addPage();y=20;drawHeader()}
  const ensureSpace=(height:number)=>{if(y+height>bottom){page()}}
  const drawHeader=()=>{
    doc.setFillColor(15,23,42);doc.rect(0,0,pageWidth,35,'F')
    doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.setFontSize(17);doc.text('JohnKay Client Engine',margin,15)
    doc.setFont('helvetica','normal');doc.setFontSize(9);doc.text('JohnKay Fundz · CLIENT PROJECT PROPOSAL',margin,23)
    doc.text(new Date().toLocaleDateString('en-NG'),pageWidth-margin,23,{align:'right'})
    doc.setTextColor(15,23,42)
    y=44
  }
  const block=(title:string,items:string[],titleSize=12)=>{
    ensureSpace(14)
    doc.setFont('helvetica','bold');doc.setFontSize(titleSize);doc.text(safe(title),margin,y);y+=7
    items.forEach(text=>{
      const lines=doc.splitTextToSize(safe(text),contentWidth-4)
      const height=lines.length*5+3
      ensureSpace(height)
      doc.setFont('helvetica','normal');doc.setFontSize(10);doc.text(lines,margin+2,y);y+=height
    })
    y+=3
  }

  drawHeader()
  block('CLIENT',[
    'Prepared for: '+data.company,
    'Contact: '+(data.contact||'Not provided'),
    'Prepared by: John Kalumba — JohnKay Fundz'
  ])
  block('PROJECT SCOPE',['Recommended solution: '+data.service,'Timeline: '+data.timeline])
  if(data.opportunities.length)block('KEY OPPORTUNITIES',data.opportunities.slice(0,8).map(x=>'• '+x))
  if(data.findings.length)block('ANALYSIS FINDINGS',data.findings.slice(0,8).map(x=>'• '+x))
  block('DELIVERABLES',data.deliverables.map(x=>'• '+x))
  block('FINANCIAL SUMMARY',[
    'Investment: '+money(data.investment),
    'Tax ('+data.taxRate+'%): '+money(data.tax),
    'TOTAL CLIENT INVESTMENT: '+money(data.total)
  ],12)

  ensureSpace(32)
  doc.setFont('helvetica','bold');doc.setFontSize(12);doc.text('MILESTONE PAYMENTS',margin,y);y+=7
  const milestoneHeight=22
  doc.setFillColor(248,250,252);doc.roundedRect(margin,y,contentWidth,milestoneHeight,2,2,'F')
  doc.setTextColor(15,23,42);doc.setFont('helvetica','bold');doc.setFontSize(10);doc.text('50% · Project start',margin+5,y+8)
  doc.setFont('helvetica','normal');doc.text(money(data.investment*.5),pageWidth-margin-5,y+8,{align:'right'})
  doc.text('50% · Final delivery',margin+5,y+16)
  doc.text(money(data.investment*.5),pageWidth-margin-5,y+16,{align:'right'})
  y+=milestoneHeight+7

  block('NEXT STEPS',[
    '1. Confirm the scope and required content.',
    '2. Provide business information, images and other assets.',
    '3. Approve the project start and payment arrangement.',
    '4. Development, review and final delivery.'
  ])
  ensureSpace(18)
  doc.setFont('helvetica','normal');doc.setFontSize(10);doc.text('Thank you for considering JohnKay Fundz.',margin,y);y+=6
  doc.setFont('helvetica','bold');doc.text('John Kalumba — JohnKay Fundz',margin,y)

  const filename=(data.company||'johnkay-proposal').replace(/[^a-z0-9]+/gi,'-').toLowerCase()+'-proposal.pdf'
  doc.save(filename)
}
