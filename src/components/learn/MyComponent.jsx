import './style.css';

const MyComponent = ()=>{

    // const check = 'Hoang';
    // const check = 123;
    // const check = true;
    // const check = undefined;
    const check = [1,2,3];
    // const check = {name:"Hoang",
    //     "age":18
    // };

  return (
    <>  
     <div> Component</div>
     <div className="hoang">
        {check} dep trai
     </div>
    </>
  );
}

export default MyComponent;