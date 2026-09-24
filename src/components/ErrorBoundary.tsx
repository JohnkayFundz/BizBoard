import React,{Component,ErrorInfo,ReactNode} from 'react'
interface Props{children:ReactNode}
interface State{hasError:boolean;message:string}
export class ErrorBoundary extends Component<Props,State>{
 state:State={hasError:false,message:''}
 static getDerivedStateFromError(error:Error):State{return{hasError:true,message:error.message||'Unexpected application error'}}
 componentDidCatch(error:Error,info:ErrorInfo){console.error('Client Engine error',error,info)}
 render(){if(this.state.hasError)return <main className="errorState"><div className="empty"><strong>Something went wrong</strong><span>{this.state.message}</span><button className="primary" onClick={()=>location.reload()}>Reload workspace</button></div></main>;return this.props.children}
}
