import TodoData from './components/todo/TodoData';
import TodoNew from './components/todo/TodoNew';
import './components/todo/todo.css';
import reactLogo from './assets/react.svg';

const App = ()=> {



  return (
    <>
      <div class="todo-container">
        <div className="todo-title">Todo List</div>
        <div>
          <TodoNew/>
          <TodoData/>
          <div className="todo-img">
            <img className="logo" src={reactLogo} alt="" />
          </div>
        </div>
      </div>
    </>
  )
}

export default App
