![Ye6rupMjAWk.jpg](https://upload-images.jianshu.io/upload_images/6393906-e8b566b2a1544d28.jpg?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

## DataSourceTransactionManager 解析

1. getTransaction(TransactionDefinition)
   主要目的开启一个事务，判断 是否 存在一个事务
   如果存在，则根据传播行为进行相应处理。===> 挂起当前事务 或者 是 抛异常
   如果不存在事务，也需要根据传播行为来。

流程：1.获取 transaction object ，以判断是否存在当前事务
Object transaction = doGetTransaction() //模板方法，子类实现

获取的类型会根据实现的子类不同 类型会不同。

```
1.CglibAopProxy$DynamicAdvisedInterceptor.intercept 656
2.ReflectiveMethodInvocation.proceed() 179
3.TransactionInterceptor.invoke 96
4.TransactionAspectSupport.invokeWithinTransaction 277
5.TransactionAspectSupport.createTransactionIfNecessary 447
6.AbstractPlatformTransactionManager.getTransaction
7.DataSourceTransactionManager.doBegin

```

# 基于声明式事务管理的`Aspect`切面

- `TransactionAspectSupport` 可以手动设置回滚 具体例子：`http://www.cnblogs.com/liuzhenlei/p/6777644.html`
  使用到了`ThreadLocal`

`TransactionAttribute` 的`rollbackOn`

常见问题和解决方案： https://blog.csdn.net/bejustice/article/details/48245741?ref=myread

- 注意：需要放在 public修饰的方法上，才会起作用。
- 注解最好放在实现类上，为了基于类的代理。

# TransactionAwareDataSourceProxy

- 动态代理
- 委派模式
  这个类继承了一个委派类，委派类是代理dataSource。
  这个类主要是在获取连接时，会通过动态代理，实际上去通过DataSourceUtils 去 getConnection ,这样连接就让Spring管理了。
  其底层应用就是使用ThreadLocal将当前连接绑定到当前线程。

---

# 解析tx xml parse 时 引入 的某些代码

package org.springframework.transaction.annotation;

## 类：`SpringTransactionAnnotationParser`

```java
@Override
public TransactionAttribute parseTransactionAnnotation(AnnotatedElement ae) {
	//此行打一个断点
	AnnotationAttributes attributes = AnnotatedElementUtils.getMergedAnnotationAttributes(ae, Transactional.class);
	if (attributes != null) {
		return parseTransactionAnnotation(attributes);
	}
	else {
		return null;
	}
}
```

# 事务 rollback

- 1.TransactionInterceptor 继承 抽象类 TransactionAspectSupport
- 2. rollback的判断在TransactionAspectSupport的`completeTransactionAfterThrowing`方法中
- 3. 具体的rollback会代理到DelegatingTransactionAttribute，传入的TransactionAttribute实现类是`RuleBasedTransactionAttribute`，这个类会判断有没用户自定义的rollback的异常，有就rollback，没有就roll 运行时异常.
     这个类继承`DefaultTransactionAttribute`

```java
public boolean rollbackOn(Throwable ex) {
		if (logger.isTraceEnabled()) {
			logger.trace("Applying rules to determine whether transaction should rollback on " + ex);
		}

		RollbackRuleAttribute winner = null;
		int deepest = Integer.MAX_VALUE;

		if (this.rollbackRules != null) {
			for (RollbackRuleAttribute rule : this.rollbackRules) {
				int depth = rule.getDepth(ex);
				if (depth >= 0 && depth < deepest) {
					deepest = depth;
					winner = rule;
				}
			}
		}

		if (logger.isTraceEnabled()) {
			logger.trace("Winning rollback rule is: " + winner);
		}

		// User superclass behavior (rollback on unchecked) if no rule matches.
		if (winner == null) {
			logger.trace("No relevant rollback rule found: applying default rules");
			return super.rollbackOn(ex);
		}

		return !(winner instanceof NoRollbackRuleAttribute);
	}


```

### Spring事务 0509

事务开启流程（以CGLIB为例）：1.执行通过 spring aop 代理后的类的某个被事务管理的方法2. CglibAopProxy.intercept() 开始执行。
关键代码:

```
retVal = new CglibMethodInvocation(proxy, target, method, args, targetClass, chain, methodProxy).proceed();
```

3.ReflectiveMethodInvocation.proceed() 执行

```
return ((MethodInterceptor) interceptorOrInterceptionAdvice).invoke(this);
```

4. TransactionInterceptor 的 invoke()方法

```
//继承关系，继承了 TransactionAspectSupport
public class TransactionInterceptor extends TransactionAspectSupport implements MethodInterceptor, Serializable

@Override
public Object invoke(final MethodInvocation invocation) throws Throwable {
	// Work out the target class: may be {@code null}.
	// The TransactionAttributeSource should be passed the target class
	// as well as the method, which may be from an interface.
	Class<?> targetClass = (invocation.getThis() != null ? AopUtils.getTargetClass(invocation.getThis()) : null);

	// Adapt to TransactionAspectSupport's invokeWithinTransaction...
	return invokeWithinTransaction(invocation.getMethod(), targetClass, new InvocationCallback() {
		@Override
		public Object proceedWithInvocation() throws Throwable {
			return invocation.proceed();
		}
	});
}

```

5.TransactionAspectSupport.invokeWithinTransaction
关键代码

```
protected Object invokeWithinTransaction(Method method, Class<?> targetClass, final InvocationCallback invocation)
			throws Throwable {

		// If the transaction attribute is null, the method is non-transactional.
		final TransactionAttribute txAttr = getTransactionAttributeSource().getTransactionAttribute(method, targetClass);
		final PlatformTransactionManager tm = determineTransactionManager(txAttr);
		final String joinpointIdentification = methodIdentification(method, targetClass, txAttr);

		if (txAttr == null || !(tm instanceof CallbackPreferringPlatformTransactionManager)) {
			// Standard transaction demarcation with getTransaction and commit/rollback calls.
			TransactionInfo txInfo = createTransactionIfNecessary(tm, txAttr, joinpointIdentification);
			Object retVal = null;
			try {
				// This is an around advice: Invoke the next interceptor in the chain.
				// This will normally result in a target object being invoked.
				retVal = invocation.proceedWithInvocation();
			}
			catch (Throwable ex) {
				// target invocation exception
				completeTransactionAfterThrowing(txInfo, ex);
				throw ex;
			}
			finally {
				cleanupTransactionInfo(txInfo);
			}
			commitTransactionAfterReturning(txInfo);
			return retVal;
		}

		else {
			// It's a CallbackPreferringPlatformTransactionManager: pass a TransactionCallback in.
			try {
				Object result = ((CallbackPreferringPlatformTransactionManager) tm).execute(txAttr,
						new TransactionCallback<Object>() {
							@Override
							public Object doInTransaction(TransactionStatus status) {
								TransactionInfo txInfo = prepareTransactionInfo(tm, txAttr, joinpointIdentification, status);
								try {
									return invocation.proceedWithInvocation();
								}
								catch (Throwable ex) {
									if (txAttr.rollbackOn(ex)) {
										// A RuntimeException: will lead to a rollback.
										if (ex instanceof RuntimeException) {
											throw (RuntimeException) ex;
										}
										else {
											throw new ThrowableHolderException(ex);
										}
									}
									else {
										// A normal return value: will lead to a commit.
										return new ThrowableHolder(ex);
									}
								}
								finally {
									cleanupTransactionInfo(txInfo);
								}
							}
						});

				// Check result: It might indicate a Throwable to rethrow.
				if (result instanceof ThrowableHolder) {
					throw ((ThrowableHolder) result).getThrowable();
				}
				else {
					return result;
				}
			}
			catch (ThrowableHolderException ex) {
				throw ex.getCause();
			}
		}
}



```

6.TransactionAspectSupport.createTransactionIfNecessary

```
//这里 tm 传入的是 DataSourceTransactionManager
protected TransactionInfo createTransactionIfNecessary(
			PlatformTransactionManager tm, TransactionAttribute txAttr, final String joinpointIdentification) {

		// If no name specified, apply method identification as transaction name.
		if (txAttr != null && txAttr.getName() == null) {
			txAttr = new DelegatingTransactionAttribute(txAttr) {
				@Override
				public String getName() {
					return joinpointIdentification;
				}
			};
		}

		TransactionStatus status = null;
		if (txAttr != null) {
			if (tm != null) {
				//关键代码，获取 transaction
				status = tm.getTransaction(txAttr);
			}
			else {
				if (logger.isDebugEnabled()) {
					logger.debug("Skipping transactional joinpoint [" + joinpointIdentification +
							"] because no transaction manager has been configured");
				}
			}
		}
		return prepareTransactionInfo(tm, txAttr, joinpointIdentification, status);
}

```

7.AbstractPlatformTransactionManager.getTransaction

### 这样第一阶段，开启事务并获取连接已经完成

---

## Rollback

```
rollback(TransactionStatus status)
    -> processRollback()
           ->doRollback
                ->DataSourceTransactionManager.doRollback
                     ->con.rollback
```

其中`rollback(TransactionStatus status) `为`PlatformTransaction`的接口方法
`doRollback`是`AbstractPlatfromTransaction`的抽象方法
最终的`con.rollback`是`jdbc`的接口方法
